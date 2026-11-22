// Measurement plumbing shared by every scenario.
import { flushOps } from "solid-fuse";

declare const fjs: { bridge_call: (v: any) => Promise<any> };

const perf = (globalThis as any).performance;
/** Monotonic milliseconds inside QuickJS. */
export const now: () => number =
  perf && typeof perf.now === "function" ? () => perf.now() : () => Date.now();
export const clockKind = perf && typeof perf.now === "function" ? "performance.now" : "Date.now";

export const stats = {
  detail: false,
  batches: 0,
  ops: 0,
  bytes: 0,
  kinds: {} as Record<string, number>,
  sendMs: 0,
  stringifyMs: 0,
};

export function resetStats() {
  stats.batches = stats.ops = stats.bytes = 0;
  stats.kinds = {};
  stats.sendMs = stats.stringifyMs = 0;
}

// Count what crosses the bridge. On main the batch is `{channel: "_ops", json}`,
// the op objects as one JSON string. `detail` (op count, kinds, and a second
// JSON.stringify of the same batch to time it) costs JS time, so timing passes
// run with it off and a separate pass turns it on.
const origBridgeCall = fjs.bridge_call;
fjs.bridge_call = function (msg: any) {
  if (msg && msg.channel === "_ops") {
    stats.batches++;
    if (typeof msg.json === "string") stats.bytes += msg.json.length;
    if (stats.detail) {
      const list: any[] = msg.ops ?? JSON.parse(msg.json);
      const t = now();
      JSON.stringify(list);
      stats.stringifyMs += now() - t;
      stats.ops += list.length;
      for (const o of list) stats.kinds[o.op] = (stats.kinds[o.op] ?? 0) + 1;
      return origBridgeCall.call(fjs, msg);
    }
    const t = now();
    const r = origBridgeCall.call(fjs, msg);
    stats.sendMs += now() - t;
    return r;
  }
  return origBridgeCall.call(fjs, msg);
};

export interface Timed {
  jsMs: number;
  sendMs: number;
  batches: number;
  bytes: number;
  ops?: number;
  kinds?: Record<string, number>;
  [k: string]: any;
}

/** Run `fn`, then flush Solid effects and the op journal; report uninterrupted JS time. */
export function timed(fn: () => void, extra: Record<string, any> = {}): Timed {
  resetStats();
  const t0 = now();
  fn();
  flushOps();
  const jsMs = now() - t0;
  const out: Timed = { jsMs, sendMs: stats.sendMs, batches: stats.batches, bytes: stats.bytes, ...extra };
  if (stats.detail) {
    out.ops = stats.ops;
    out.kinds = stats.kinds;
    out.stringifyMs = stats.stringifyMs;
  }
  return out;
}
