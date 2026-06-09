// Polyfills for APIs not provided by fjs's JsBuiltinOptions.all().
// Currently: structuredClone, URL (relative form), WebSocket, console.

import { send, on } from "~/channels";

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (value: any) => JSON.parse(JSON.stringify(value));
}

// QuickJS's built-in URL doesn't support the two-argument form:
//   new URL("path", "https://base.com") → "https://base.com/path"
// Supabase SDK and others need this.
// QuickJS's built-in URL has incomplete support for the two-argument form.
// Always wrap it to guarantee correct behavior with relative paths and URL bases.
if (typeof globalThis.URL !== "undefined") {
  const _NativeURL = globalThis.URL;
  globalThis.URL = function URL(
    url: string | URL,
    base?: string | URL,
  ): URL {
    if (base !== undefined) {
      const baseStr = typeof base === "string" ? base : base.href;
      const urlStr = typeof url === "string" ? url : url.href;
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(urlStr)) {
        return new _NativeURL(urlStr);
      }
      const b = baseStr.endsWith("/") ? baseStr : baseStr + "/";
      return new _NativeURL(b + urlStr);
    }
    return new _NativeURL(typeof url === "string" ? url : url.href);
  } as any;
  Object.setPrototypeOf(globalThis.URL, _NativeURL);
  globalThis.URL.prototype = _NativeURL.prototype;
}

// WebSocket — delegates to Dart via channels for actual connections.
// Dart pushes events back via channels.send('_wsEvent', ...).
if (typeof globalThis.WebSocket === "undefined") {
  const CONNECTING = 0;
  const OPEN = 1;
  const CLOSING = 2;
  const CLOSED = 3;

  const registry = new Map<number, FuseWebSocket>();
  let nextId = 0;

  class FuseWebSocket {
    static readonly CONNECTING = CONNECTING;
    static readonly OPEN = OPEN;
    static readonly CLOSING = CLOSING;
    static readonly CLOSED = CLOSED;

    readonly _id: number;
    readonly url: string;
    readyState: number = CONNECTING;
    protocol: string = "";
    binaryType: string = "blob";
    bufferedAmount: number = 0;
    extensions: string = "";

    onopen: ((ev: any) => void) | null = null;
    onmessage: ((ev: any) => void) | null = null;
    onclose: ((ev: any) => void) | null = null;
    onerror: ((ev: any) => void) | null = null;

    constructor(url: string, protocols?: string | string[]) {
      this._id = nextId++;
      this.url = url;
      registry.set(this._id, this);
      send("_ws", {
        op: "open",
        id: this._id,
        url,
        protocols: Array.isArray(protocols)
          ? protocols
          : protocols
            ? [protocols]
            : [],
      });
    }

    send(data: string | ArrayBuffer) {
      if (this.readyState !== OPEN) {
        throw new Error("WebSocket is not open");
      }
      send("_ws", {
        op: "send",
        id: this._id,
        data,
      });
    }

    close(code?: number, reason?: string) {
      if (this.readyState === CLOSING || this.readyState === CLOSED) return;
      this.readyState = CLOSING;
      send("_ws", {
        op: "close",
        id: this._id,
        code: code ?? 1000,
        reason: reason ?? "",
      });
    }

    // No-op addEventListener/removeEventListener for basic compat.
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }

  // Handle WebSocket events from Dart.
  on("_wsEvent", (data: { id: number; type: string; [key: string]: any }) => {
    const ws = registry.get(data.id);
    if (!ws) return;

    switch (data.type) {
      case "open":
        ws.readyState = OPEN;
        ws.protocol = data.protocol || "";
        ws.onopen?.({ type: "open" });
        break;
      case "message":
        ws.onmessage?.({ type: "message", data: data.data });
        break;
      case "close":
        ws.readyState = CLOSED;
        ws.onclose?.({
          type: "close",
          code: data.code ?? 1000,
          reason: data.reason ?? "",
          wasClean: data.wasClean ?? true,
        });
        registry.delete(data.id);
        break;
      case "error":
        ws.onerror?.({ type: "error", message: data.message });
        break;
    }
  });

  globalThis.WebSocket = FuseWebSocket as any;
}

// requestAnimationFrame / cancelAnimationFrame — driven by Flutter's real
// vsync, not a JS timer. A timer-based rAF drifts against the actual refresh
// rate; instead Dart drives its frame pipeline and calls `_rafTick` into JS
// once per vsync (see dart/lib/src/raf_driver.dart). The clock lives on Dart:
// the timestamp handed to each callback is Flutter's monotonic
// `currentFrameTimeStamp`, in milliseconds — same units as the DOM's.
//
// Always installed (not guarded behind `typeof`): any rAF fjs's builtins might
// provide would be timer-based, which is exactly what we're avoiding.
{
  type FrameCallback = (time: number) => void;

  const callbacks = new Map<number, FrameCallback>();
  let nextId = 1;
  // True while Dart is driving the frame loop. Lets us wake Dart only on the
  // empty → non-empty transition, so nothing ticks when nothing's animating.
  let running = false;

  globalThis.requestAnimationFrame = (cb: FrameCallback): number => {
    const id = nextId++;
    callbacks.set(id, cb);
    if (!running) {
      running = true;
      // Fire-and-forget: a JS→Dart call must never be awaited from inside a
      // Dart→JS dispatch (it panics the bridge), and there's nothing to await.
      send("_raf", { op: "wake" });
    }
    return id;
  };

  globalThis.cancelAnimationFrame = (id: number): void => {
    callbacks.delete(id);
  };

  // Dart calls this once per vsync with the frame timestamp (ms, monotonic).
  // Snapshot and clear the queue *before* running, so callbacks that re-arm via
  // requestAnimationFrame land on the NEXT frame (standard rAF semantics), not
  // this one. The return value tells Dart whether to schedule another frame;
  // when the queue drains, Dart idles until the next `wake`.
  on("_rafTick", (data: { ts: number }) => {
    const batch = [...callbacks.values()];
    callbacks.clear();
    for (const cb of batch) {
      try {
        cb(data.ts);
      } catch (err) {
        // One bad callback shouldn't abort the rest of the frame.
        console.error(err);
      }
    }
    running = callbacks.size > 0;
    return { more: running };
  });
}

// console — fjs doesn't provide one, and a missing method throws
// "console.x is not a function" deep inside dependency code (e.g. Convex's
// verbose logger calls console.debug). Every line is shipped to Dart over the
// `_log` channel, which prints it as `[Fuse JS] …`.
//
// Args are formatted faithfully: strings pass through; Errors print their stack;
// objects are JSON-stringified (so logging an object doesn't degrade to
// "[object Object]"); and the standard printf specifiers (%s %d %i %f %o %O %c
// %%) are honoured the way browsers do.
{
  const fmtVal = (v: any): string => {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.stack ?? `${v.name}: ${v.message}`;
    if (v !== null && typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  const format = (args: any[]): string => {
    if (args.length === 0) return "";
    const first = args[0];
    // No format string → just space-join every arg.
    if (typeof first !== "string" || !first.includes("%")) {
      return args.map(fmtVal).join(" ");
    }
    let i = 1;
    let out = first.replace(/%[sdifoOc%]/g, (spec) => {
      if (spec === "%%") return "%";
      if (i >= args.length) return spec; // no arg left → leave the literal
      const arg = args[i++];
      switch (spec) {
        case "%c":
          return ""; // CSS styling — drop it, terminal can't render it
        case "%s":
          return String(arg);
        case "%d":
        case "%i":
          return String(parseInt(arg, 10));
        case "%f":
          return String(parseFloat(arg));
        default: // %o %O
          return fmtVal(arg);
      }
    });
    // Extra args beyond the specifiers get appended, space-separated.
    for (; i < args.length; i++) out += " " + fmtVal(args[i]);
    return out;
  };

  const emit = (prefix: string, args: any[]) =>
    send("_log", { message: prefix + format(args) });
  const noop = () => {};

  globalThis.console = {
    log: (...a: any[]) => emit("", a),
    info: (...a: any[]) => emit("", a),
    debug: (...a: any[]) => emit("", a),
    dir: (...a: any[]) => emit("", a),
    trace: (...a: any[]) => emit("[TRACE] ", [...a, new Error().stack]),
    warn: (...a: any[]) => emit("[WARN] ", a),
    error: (...a: any[]) => emit("[ERROR] ", a),
    group: (...a: any[]) => emit("", a),
    groupCollapsed: (...a: any[]) => emit("", a),
    groupEnd: noop,
    table: (...a: any[]) => emit("", a),
    assert: (cond: any, ...a: any[]) => {
      if (!cond) emit("[ASSERT] ", a);
    },
    count: noop,
    countReset: noop,
    time: noop,
    timeEnd: noop,
    timeLog: noop,
  } as any;
}
