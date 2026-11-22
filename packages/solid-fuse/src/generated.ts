/**
 * Runtime support for the modules `fuse gen` writes. Not for app code.
 */
import { createEffect, createSignal, untrack } from "solid-js";
import { channels } from "./channels";
import { reportDevError } from "./dev-error";
import { type FuseNode, createOwnedNode, setHandler } from "./renderer";

/**
 * Builds the wire value of a Dart constructor call: `$build("EdgeInsets.only",
 * [], [{ left: 8 }])` is `{ $: "EdgeInsets.only", left: 8 }`. Positional
 * arguments are stored under their Dart parameter names; an object after
 * them holds the named ones. The compile step folds calls with literal
 * arguments into the same value (cli/compile-plugin.ts).
 */
export function $build(tag: string, positional: readonly string[], args: readonly unknown[]): Record<string, unknown> {
  const value: Record<string, unknown> = { $: tag };
  const n = positional.length;
  for (let i = 0; i < n && i < args.length; i++) {
    if (args[i] !== undefined) value[positional[i]] = args[i];
  }
  const named = args[n];
  if (named != null && typeof named === "object") Object.assign(value, named);
  return value;
}

// --- Handles ---

/** What a generated handle type offers (emitted per type). */
export interface HandleSpec {
  /** Mirrored state: getters Dart pushes. */
  s: string[];
  /** Setters (`setX`). */
  w: string[];
  /** Setters that show the new value at once (state of the same name). */
  o: string[];
  /** Methods, each returning a Promise. */
  m: string[];
  /** Stream getters, read as async iterables. */
  st: string[];
}

/** Per constructor. */
export interface HandleCtor {
  /** Dart's named constructor; none is the unnamed one. */
  ctor?: string;
  /** Options that are callbacks, not accessors. */
  fns?: string[];
  /** Options with a setter of the same name: an accessor stays in sync. */
  live?: string[];
  /** State values before Dart's first push. */
  seeds?: Record<string, unknown>;
}

const structural = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!structural((a as any)[k], (b as any)[k])) return false;
  return true;
};

const reportAsync = (p: Promise<unknown>) => p.catch(reportDevError);

/**
 * Creates the Dart object behind a generated `createX`. The object lives
 * while the calling owner does, and after that for as long as JS can reach
 * the handle (see `createOwnedNode`).
 *
 * State Dart pushes carries the newest write version Dart has applied; a
 * push older than JS's last write is dropped, so a value JS just set never
 * jumps back to what Dart had before.
 */
export function $handle(type: string, spec: HandleSpec, options: object | undefined, ctor: HandleCtor): object {
  const fns = new Set(ctor.fns);
  const live = new Set(ctor.live);
  const props: Record<string, unknown> = {};
  const accessors: [string, () => unknown][] = [];
  if (options) {
    for (const key in options) {
      const v = (options as Record<string, unknown>)[key];
      if (typeof v === "function" && !fns.has(key)) {
        // An accessor: read once now (untracked), followed only when a setter can.
        props[key] = untrack(v as () => unknown);
        if (live.has(key)) accessors.push([key, v as () => unknown]);
      } else {
        props[key] = v;
      }
    }
  }
  if (ctor.ctor) props.$ctor = ctor.ctor;

  let version = 0;
  const signals = new Map<string, [() => unknown, (v: unknown) => void]>();
  for (const name of spec.s) {
    const seed = props[name] !== undefined ? props[name] : ctor.seeds?.[name];
    const [get, set] = createSignal<unknown>(seed, { equals: structural, ownedWrite: true } as any);
    signals.set(name, [get, (v) => set(() => v)]);
  }
  props.$push = (msg: { v: number; s: Record<string, unknown> }) => {
    if (msg.v < version) return; // left Dart before JS's latest write landed
    for (const key in msg.s) signals.get(key)?.[1](msg.s[key]);
  };

  const node = createOwnedNode(type, props);
  const call = (method: string, value: unknown) => channels.call("_handleCall", { node: node.id, method, value }, { timeout: 0 });
  const handle: Record<string, unknown> = { node };
  for (const [name, [get]] of signals) handle[name] = get;
  const optimistic = new Set(spec.o);
  const write = (name: string, value: unknown) => {
    version++;
    if (optimistic.has(name)) signals.get(name)?.[1](value);
    reportAsync(call("$set", { n: name, v: value, ver: version }));
  };
  for (const name of spec.w) handle[`set${name[0].toUpperCase()}${name.slice(1)}`] = (v: unknown) => write(name, v);
  for (const name of spec.m) handle[name] = (...args: unknown[]) => call(name, args);
  for (const name of spec.st) handle[name] = () => stream(node, call, name);
  for (const [name, read] of accessors) {
    createEffect(read, (v, prev) => {
      // The first run is the value the constructor already has.
      if (prev !== undefined || v !== props[name]) write(name, v);
    });
  }
  return handle;
}

let nextStream = 0;

function stream(node: FuseNode, call: (method: string, value: unknown) => Promise<unknown>, name: string): AsyncIterable<unknown> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<unknown> {
      const fn = `$s${nextStream++}`;
      const queue: unknown[] = [];
      let wake: (() => void) | null = null;
      let done = false;
      let error: string | undefined;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        setHandler(node, fn, undefined);
      };
      setHandler(node, fn, (e: { v?: unknown; e?: string; d?: true }) => {
        if (e.d) done = true;
        else if (e.e !== undefined) error = e.e;
        else queue.push(e.v);
        wake?.();
      });
      const started = call("$listen", { stream: name, fn }).catch((err) => {
        error = err instanceof Error ? err.message : String(err);
        wake?.();
      });
      return {
        async next() {
          await started;
          for (;;) {
            if (queue.length) return { value: queue.shift(), done: false };
            if (error !== undefined) {
              close();
              throw new Error(error);
            }
            if (done) {
              close();
              return { value: undefined, done: true };
            }
            await new Promise<void>((r) => (wake = r));
            wake = null;
          }
        },
        async return() {
          if (!done) reportAsync(call("$cancel", { fn }));
          done = true;
          close();
          return { value: undefined, done: true };
        },
      };
    },
  };
}
