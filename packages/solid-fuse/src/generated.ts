/**
 * Runtime support for the modules `fuse gen` writes. Not for app code.
 */
import { createEffect, createSignal, untrack } from "solid-js";
import { channels } from "./channels";
import { reportDevError } from "./dev-error";
import { type FuseNode, _setDecodeIn, adoptNode, createOwnedNode, nodeById, setHandler, wireOf } from "./renderer";

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

declare const constName: unique symbol;

/**
 * A Dart constant on the wire: its name (`"Colors.red"`). Only the owner's
 * generated export makes one, never a plain string, so the build sees every
 * constant the app uses and keeps the Dart side of just those.
 */
export type Const<N extends string> = string & { readonly [constName]: N };

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

/** Every handle type's spec by node type, registered by the generated
 *  modules: a handle Dart hands to JS gets the members of its type. */
const specs = new Map<string, HandleSpec>();
const NO_SPEC: HandleSpec = { s: [], w: [], o: [], m: [], st: [] };

export function $handleType(type: string, spec: HandleSpec): void {
  specs.set(type, spec);
}

/**
 * Creates the Dart object behind a generated `createX`. The object lives
 * while the calling owner does, and after that for as long as JS can reach
 * the handle (see `createOwnedNode`).
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
  const seeds: Record<string, unknown> = {};
  for (const name of spec.s) seeds[name] = props[name] !== undefined ? props[name] : ctor.seeds?.[name];

  const node = createOwnedNode(type, props);
  const { handle, write } = build(node, spec, seeds);
  for (const [name, read] of accessors) {
    createEffect(read, (v, prev) => {
      // The first run is the value the constructor already has.
      if (prev !== undefined || v !== props[name]) write(name, v);
    });
  }
  return handle;
}

/** A handle reference as Dart sends it: the node id, its type, `o` when JS
 *  created it, and `s`, the mirrored state, when Dart has just made it. */
interface HandleRef {
  $h: number;
  t: string;
  o?: 1;
  s?: Record<string, unknown>;
}

/** How many references Dart sent for each borrowed handle JS holds; Dart
 *  keeps the object reachable until they are all given back. */
const lent = new Map<number, { id: number; n: number }>();

/**
 * The handle for a reference from Dart: the one JS already has for that
 * node, or a new one. A handle JS did not create is borrowed: Dart counts
 * the references it sends, and once JS lets go of the handle it gives them
 * back (`_unborrow`), so Dart forgets the object. Counting, not a flag, so a
 * reference that crosses while the last one is given back is never lost.
 */
function borrow(ref: HandleRef): object {
  const id = ref.$h;
  const known = nodeById(id)?.handle;
  if (known) {
    if (!ref.o) {
      const rec = lent.get(id);
      if (rec) rec.n++;
      else channels.send("_unborrow", { id, n: 1 });
    }
    return known;
  }
  const rec = { id, n: ref.o ? 0 : 1 };
  if (!ref.o) lent.set(id, rec);
  const node = adoptNode(ref.t, id, () => {
    if (lent.get(rec.id) === rec) lent.delete(rec.id);
    if (rec.n > 0) channels.send("_unborrow", { id: rec.id, n: rec.n });
  });
  const spec = specs.get(ref.t) ?? NO_SPEC;
  const seeds = ref.s ? (decode(ref.s) as Record<string, unknown>) : {};
  const { handle, call } = build(node, spec, seeds);
  // No state with it: Dart had the object already, so ask for it.
  if (!ref.s && spec.s.length) reportAsync(call("$sync", null));
  return handle;
}

/** [v] with the handle references in it turned into handles. */
function decode(v: unknown, depth = 0): unknown {
  if (v === null || typeof v !== "object" || depth > 32) return v;
  const r = v as Record<string, unknown>;
  if (typeof r.$h === "number" && typeof r.t === "string") return borrow(r as unknown as HandleRef);
  let out: any;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const d = decode(v[i], depth + 1);
      if (d !== v[i]) (out ??= v.slice())[i] = d;
    }
  } else {
    for (const key in r) {
      const d = decode(r[key], depth + 1);
      if (d !== r[key]) (out ??= { ...r })[key] = d;
    }
  }
  return out ?? v;
}

_setDecodeIn(decode);

/**
 * The JS side of a handle on [node]: mirrored state, setters, methods and
 * streams, as [spec] lists them.
 *
 * State Dart pushes carries the newest write version Dart has applied; a
 * push older than JS's last write is dropped, so a value JS just set never
 * jumps back to what Dart had before.
 */
function build(node: FuseNode, spec: HandleSpec, seeds: Record<string, unknown>) {
  let version = 0;
  const signals = new Map<string, [() => unknown, (v: unknown) => void]>();
  for (const name of spec.s) {
    const [get, set] = createSignal<unknown>(seeds[name], { equals: structural, ownedWrite: true } as any);
    signals.set(name, [get, (v) => set(() => v)]);
  }
  setHandler(node, "$push", (msg: { v: number; s: Record<string, unknown> }) => {
    if (msg.v < version) return; // left Dart before JS's latest write landed
    for (const key in msg.s) signals.get(key)?.[1](msg.s[key]);
  });
  const call = (method: string, value: unknown) =>
    channels.call("_handleCall", { node: node.id, method, value: wireOf(value) }, { timeout: 0 }).then(decode);
  const handle: Record<string, unknown> = { node };
  node.handle = handle;
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
  return { handle, write, call };
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
