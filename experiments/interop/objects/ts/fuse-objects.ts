// Hand-written JS runtime for GENERATED object factories and plugin modules.
// It is the only code between the generated TS and solid-fuse's existing
// primitives: createHandle (nodes, RPC, owner-scoped dispose) and channels.
//
// "solid-fuse/*" resolves to the real source in packages/solid-fuse/src
// (see tsconfig.json), so this file is type-checked against it.
import { getOwner, onCleanup } from "solid-js";
import { createHandle, type Handle } from "solid-fuse/handle";
import { channels } from "solid-fuse/channels";
import { FuseNode, setProp as rawSetProp } from "solid-fuse/renderer";

// ── typed errors ────────────────────────────────────────────────────────────

/** What Dart's `fuseEncodeError` sends: the envelope under `$err`. */
export interface FuseErrorInfo {
  /** Dart exception class: "PlatformException", "ArgumentError", "StateError", "TickerCanceled", ... */
  type: string;
  message: string;
  /** PlatformException.code, ArgumentError.name, or the unknown member name. */
  code?: string;
  details?: unknown;
  /** Dart stack trace (debug builds only). */
  stack?: string;
}

/** A Dart exception that crossed the bridge with its fields intact. */
export class FuseError extends Error {
  readonly type: string;
  readonly code?: string;
  readonly details?: unknown;
  readonly dartStack?: string;
  constructor(info: FuseErrorInfo) {
    super(info.message);
    this.name = "FuseError";
    this.type = info.type;
    this.code = info.code;
    this.details = info.details;
    this.dartStack = info.stack;
  }
}

function unwrap(v: any): any {
  if (v !== null && typeof v === "object" && "$err" in v) throw new FuseError(v.$err as FuseErrorInfo);
  return v;
}

// ── objects (handles) ───────────────────────────────────────────────────────

/**
 * Structural brand: `N` lists the Dart class and all its supertypes, so a
 * handle is accepted wherever one of its supertypes is expected and rejected
 * elsewhere (an AnimationController is an Animation; a FocusNode is not).
 */
export type FuseObject<N extends string> = {
  readonly node: FuseNode;
  readonly __is?: Record<N, true>;
};

/** The wire form of an object Dart created: its node id, type, and current mirrored state. */
export interface ObjectRef {
  _node: number;
  type: string;
  state?: Record<string, any>;
}

/** Subscribe to a Dart stream. Returns the unsubscribe function. */
export type FuseStream<T> = (listener: (event: T) => void, onError?: (error: FuseError) => void) => () => void;

export interface ObjectRuntime<K extends string> extends Handle<K> {
  /** RPC to a bridged method. Arguments cross as one map keyed by parameter name. */
  invoke(method: string, args?: Record<string, any>, timeout?: number): Promise<any>;
  /** Read a getter on demand. */
  get(name: string): Promise<any>;
  /** Assign a setter. */
  set(name: string, value: any): Promise<void>;
  /** Install the signal setters that Dart's state patches are applied to. */
  mirror(setters: Record<string, (v: any) => void>): void;
  stream(name: string, args?: Record<string, any>): FuseStream<any>;
  dispose(): void;
}

/** `{_node: id}` for an object passed as an RPC argument. */
export function objRef(h: { node: FuseNode } | null | undefined): { _node: number } | null | undefined {
  return h == null ? h : { _node: h.node.id };
}

function runtimeFor<K extends string>(
  node: FuseNode<K>,
  call: (method: string, value?: any, options?: { timeout?: number }) => Promise<any>,
  dispose: () => void,
  wire: { setters: Record<string, (v: any) => void>; listeners: Map<string, Set<[(e: any) => void, ((e: FuseError) => void) | undefined]>> },
): ObjectRuntime<K> {
  const invoke = (method: string, args?: Record<string, any>, timeout?: number) =>
    call(method, args, timeout === undefined ? undefined : { timeout }).then(unwrap);
  return {
    node,
    invoke,
    get: (name) => invoke("$get", { name }),
    set: (name, value) => invoke("$set", { name, value }),
    mirror: (setters) => {
      wire.setters = setters;
    },
    stream: (name, args) => (listener, onError) => {
      let set = wire.listeners.get(name);
      if (!set) wire.listeners.set(name, (set = new Set()));
      const entry: [(e: any) => void, ((e: FuseError) => void) | undefined] = [listener, onError];
      // Dart subscribes on the first JS listener and cancels on the last.
      if (set.size === 0) void invoke("$listen", { name, ...args });
      set.add(entry);
      return () => {
        set!.delete(entry);
        if (set!.size === 0) void invoke("$cancel", { name }).catch(() => {});
      };
    },
    dispose,
  };
}

function wiring() {
  const wire = {
    setters: {} as Record<string, (v: any) => void>,
    listeners: new Map<string, Set<[(e: any) => void, ((e: FuseError) => void) | undefined]>>(),
  };
  const props = {
    // One message per Dart notification, carrying only what changed.
    $state: (patch: Record<string, any>) => {
      for (const k in patch) wire.setters[k]?.(patch[k]);
    },
    $event: (ev: { s: string; v?: any; e?: FuseErrorInfo }) => {
      for (const [listener, onError] of wire.listeners.get(ev.s) ?? []) {
        if (ev.e) onError?.(new FuseError(ev.e));
        else listener(ev.v);
      }
    },
  };
  return { wire, props };
}

/**
 * Create a Dart object from JS. Same lifetime as `createHandle`: disposed by
 * the reactive owner it was created under, or by `dispose()`.
 */
export function createObject<K extends string>(type: K, props: Record<string, any>): ObjectRuntime<K> {
  const { wire, props: fns } = wiring();
  // `undefined` options must not reach the create op as explicit keys.
  const clean: Record<string, any> = {};
  for (const k in props) if (props[k] !== undefined) clean[k] = props[k];
  const { node, call, dispose } = createHandle(type, { ...clean, ...fns });
  return runtimeFor(node, call, dispose, wire);
}

/**
 * Wrap an object Dart created (negative node id). JS did not create it and
 * does not own it by default: `dispose()` only drops the Dart node, and Dart
 * decides (owned vs borrowed) whether that disposes the object. If adopted
 * inside a reactive owner, the node is dropped with that owner.
 */
export function adoptObject<K extends string>(type: K, ref: ObjectRef): ObjectRuntime<K> {
  const { wire, props: fns } = wiring();
  const node = new FuseNode(type);
  node.id = ref._node;
  // Registers the JS handlers under this node id and tells Dart they exist.
  rawSetProp(node, "$state", fns.$state);
  rawSetProp(node, "$event", fns.$event);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    channels.send("_ops", { ops: [{ op: "dispose", id: node.id }] });
  };
  if (getOwner()) onCleanup(dispose);
  const call = (method: string, value?: any, options?: { timeout?: number }) =>
    channels.call("_handleCall", { node: node.id, method, value }, options);
  return runtimeFor(node, call, dispose, wire);
}

// ── plugin modules ──────────────────────────────────────────────────────────

export interface ModuleRuntime {
  invoke(method: string, args?: Record<string, any>, timeout?: number): Promise<any>;
  stream(name: string, args?: Record<string, any>): FuseStream<any>;
}

/** One channel per generated module: `mod:<name>` for calls, `mod:<name>:event` for stream events. */
export function createModule(name: string): ModuleRuntime {
  const channel = `mod:${name}`;
  const subs = new Map<number, [(e: any) => void, ((e: FuseError) => void) | undefined]>();
  let nextSub = 1;
  channels.on(`${channel}:event`, (ev: { id: number; v?: any; e?: FuseErrorInfo; done?: boolean }) => {
    const s = subs.get(ev.id);
    if (!s) return;
    if (ev.done) subs.delete(ev.id);
    else if (ev.e) s[1]?.(new FuseError(ev.e));
    else s[0](ev.v);
  });
  const invoke = (method: string, args: Record<string, any> = {}, timeout?: number) =>
    channels.call(channel, { m: method, a: args }, timeout === undefined ? undefined : { timeout }).then(unwrap);
  return {
    invoke,
    stream: (stream, args) => (listener, onError) => {
      const id = nextSub++;
      subs.set(id, [listener, onError]);
      invoke("$listen", { ...args, $stream: stream, $id: id }).catch((e) => onError?.(e));
      const cancel = () => {
        if (subs.delete(id)) void invoke("$cancel", { $id: id }).catch(() => {});
      };
      if (getOwner()) onCleanup(cancel);
      return cancel;
    },
  };
}

// ── shared value types ──────────────────────────────────────────────────────

export type NamedColor =
  | "red" | "blue" | "green" | "white" | "black" | "grey"
  | "orange" | "purple" | "yellow" | "teal" | "cyan" | "amber"
  | "indigo" | "pink" | "brown" | "transparent";

/** solid-fuse's existing colour input. */
export type ColorInput =
  | NamedColor
  | `#${string}`
  | { r: number; g: number; b: number; a?: number }
  | { h: number; s: number; l: number; a?: number };
