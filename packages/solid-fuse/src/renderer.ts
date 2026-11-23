import { createRenderer, type RendererEffectOptions } from "@solidjs/universal";
import { $PROXY, createRoot, flush, getOwner, onCleanup, runWithOwner, type Owner } from "solid-js";
import { on, onAfterDispatch, onSync, _setFlushOps, _setSyncOps } from "~/channels";
import { reportDevError } from "./dev-error";
import { host } from "./host";

let nextId = 0;
let _currentComponent: string | undefined;

export class FuseNode<K extends string = string> {
  // Fields are assigned in the constructor, not declared with initialisers:
  // the es2020 build target turns class fields into one defineProperty
  // helper call each, which costs several times a plain assignment in
  // QuickJS, and this constructor runs once per element and text node.
  declare id: number;
  declare type: K;
  declare parent: FuseNode | undefined;
  // Children are a doubly linked list threaded through the nodes, so that
  // every tree hook Solid calls (insert before a sibling, remove, next
  // sibling) is constant time however long the child list is.
  declare first: FuseNode | undefined;
  declare last: FuseNode | undefined;
  declare prev: FuseNode | undefined;
  declare next: FuseNode | undefined;
  /** The batch this node's `create` op was journalled in, and where in the
   *  journal its props object sits: while that batch is unsent, props are
   *  written there instead of becoming ops of their own. */
  declare batch: number;
  declare slot: number;
  /** A node that stands for a template node is already in place on the Dart
   *  side: its first insert only links it into this mirror. */
  declare adopt: boolean;
  /** Function props by name; Dart calls them through `_functionCall`. */
  declare handlers: Record<string, Function> | undefined;
  /** Nodes this node's props refer to, by prop name (all of them, for a
   *  value with nodes inside): kept here because the Dart side uses them for
   *  as long as this node does. */
  declare refs: Record<string, FuseNode | FuseNode[]> | undefined;
  /** How many functions inside a prop's value are registered as
   *  `handlers["<prop>#<i>"]`, by prop name. */
  declare nested: Record<string, number> | undefined;
  /** Whether the node is registered with `released`. */
  declare tracked: boolean | undefined;
  /** The reactive owner where the node got its first handler: what a
   *  synchronous call (a builder) runs under, for context and lifetime. */
  declare owner: Owner | null | undefined;
  /** The generated handle this node backs, if any (see generated.ts). */
  declare handle: object | undefined;

  constructor(type: K, id: number = nextId++) {
    this.id = id;
    this.type = type;
    this.parent = undefined;
    this.first = undefined;
    this.last = undefined;
    this.prev = undefined;
    this.next = undefined;
    this.batch = -1;
    this.slot = -1;
    this.adopt = false;
    this.handlers = undefined;
  }

  /** The child nodes, in order, as a new array. */
  get children(): FuseNode[] {
    const out: FuseNode[] = [];
    for (let c = this.first; c; c = c.next) out.push(c);
    return out;
  }
}

// --- Event handlers ---

// A node owns its handlers; this map only finds the node for an id, weakly,
// so that a handler closing over its node does not keep the node alive.
const handlerNodes = new Map<number, WeakRef<FuseNode>>();

// Register the function call channel — Dart calls JS functions via channels.send('_functionCall', ...)
// A call with `args` (a Dart callback with several parameters) spreads them.
// A call with `reply` (a Dart callback that returns a Future) waits for the
// handler and answers `{ value }` or `{ error }`.
on("_functionCall", (data: { nodeId: number; name: string; value?: any; args?: any[]; reply?: boolean }) => {
  // Decoded even when nothing handles the call: a handle in it is counted.
  if (data.args) data.args = decodeIn(data.args);
  else data.value = decodeIn(data.value);
  const handler = handlerNodes.get(data.nodeId)?.deref()?.handlers?.[data.name];
  if (!data.reply) {
    if (handler === undefined) return;
    if (data.args) handler(...data.args);
    else handler(data.value);
    return;
  }
  if (handler === undefined) return { error: `no function "${data.name}" on node ${data.nodeId}` };
  return (async () => {
    try {
      const value = await (data.args ? handler(...data.args) : handler(data.value));
      return { value: encodeValue("", value, null).wire };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  })();
});

// A synchronous call: Dart waits for the result during a frame (a builder
// such as `ListView.builder`'s `itemBuilder`). The handler must not wait.
// A call for a widget runs in a root of its own, kept until Dart drops the
// widget (`_unbuild`); the result is a node, a `__slot__` node holding it,
// or null for null or undefined.
const built = new Map<number, { dispose: () => void; node: FuseNode }>();
let nextBuilt = 0;

onSync("_callSync", (data: { nodeId: number; name: string; value?: any; args?: any[]; widget?: boolean }) => {
  if (data.args) data.args = decodeIn(data.args);
  else data.value = decodeIn(data.value);
  const target = handlerNodes.get(data.nodeId)?.deref();
  const handler = target?.handlers?.[data.name];
  if (handler === undefined) return { error: `no function "${data.name}" on node ${data.nodeId}` };
  const call = () => (data.args ? handler(...data.args) : handler(data.value));
  if (!data.widget) {
    try {
      return { value: encodeValue("", call(), null).wire };
    } catch (err) {
      reportDevError(err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
  let dispose: (() => void) | undefined;
  try {
    const node = runWithOwner(target!.owner ?? null, () =>
      createRoot((d) => {
        dispose = d;
        const value = call();
        return value == null ? null : asNode(value);
      }),
    );
    if (node === null) {
      // Nothing to show (a builder past the end of its list).
      dispose!();
      return { value: null };
    }
    const id = nextBuilt++;
    built.set(id, { dispose: dispose!, node });
    track(node);
    return { value: { _node: node.id }, root: id };
  } catch (err) {
    dispose?.();
    reportDevError(err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

on("_unbuild", (data: { root: number }) => {
  const b = built.get(data.root);
  if (!b) return;
  built.delete(data.root);
  b.dispose();
});

/** The node for what a component returned: itself, or a `__slot__` node
 *  holding it (text, a list, a reactive function, nothing). */
function asNode(value: any): FuseNode {
  if (value instanceof FuseNode && !value.parent) return value;
  const slot = createNode("__slot__");
  insert(slot, value);
  return slot;
}

// --- Ops journal ---

// A batch is one flat array: an opcode followed by its operands, then the
// next opcode. No object per op: a mount of 1,000 nodes used to allocate and
// stringify about 3,700 of them. `applyOps` in dart/lib/src/runtime.dart
// reads the same layout; change both together and bump OPS_VERSION.
//
//   CREATE   id, type, props     new node; props known so far ride along
//   TEXT     id, text            new text node
//   SET_PROP id, name, value     value `{ _node: id }` references a node
//   SET_TEXT id, text
//   INSERT   parent, child, before   before: sibling id, or null to append;
//                                    an attached child moves
//   REMOVE   child               detach; the node stays usable
//   DISPOSE  id                  the node and its subtree are gone for good
//   DEFINE   template, shape     a subtree shape, sent once (see Templates)
//   INSTANTIATE template, id, component   build the shape; its nodes take
//                                consecutive ids from `id`, in document order
//   PROPS    id, props           set several props of an existing node
const CREATE = 0, TEXT = 1, SET_PROP = 2, SET_TEXT = 3, INSERT = 4, REMOVE = 5, DISPOSE = 6,
  DEFINE = 7, INSTANTIATE = 8, PROPS = 9;
const OPS_VERSION = 4;

const ops: unknown[] = [];
/** Number of the batch being journalled; bumped each time one is sent. */
let batch = 0;

// --- Node lifetime ---
//
// A Dart node lives exactly as long as JS can still reach its JS node. Solid
// has no "this node is finished" hook: it detaches a node and may insert the
// same node again much later (a `<Show>` around an element held in a
// variable), exactly as it does with DOM nodes, which the browser frees by
// garbage collection. So `remove` only detaches, and the garbage collector
// says when a node is gone: nodes that can become unreachable on their own
// (a detached subtree's root, a node referenced by a prop) are registered
// here, and `dispose` is journalled once JS has let go of them. A subtree
// stays reachable through its root for as long as any node in it is, so the
// root alone speaks for it.
const released = new FinalizationRegistry<number>((id) => {
  handlerNodes.delete(id);
  ops.push(DISPOSE, id);
  scheduleFlush();
});

function track(node: FuseNode) {
  if (node.tracked) return;
  node.tracked = true;
  released.register(node, node.id);
}

// Restarting the app evaluates the bundle again in the same engine, with
// node ids starting over. Whatever the previous evaluation still does (a
// timer, a collected node) must not reach the new tree.
const generation: number = ((globalThis as any).__fuseGeneration =
  ((globalThis as any).__fuseGeneration ?? 0) + 1);

// --- Auto-flush machinery ---

const root: FuseNode = new FuseNode("root");
let flushScheduled = false;
let rendering = false;

/**
 * Batches sent to Dart that Dart may not have applied yet, by number. A
 * synchronous call hands them over again ahead of its own batch: Dart is
 * busy in the call, so the messages carrying them are still queued there.
 * Dart skips a batch it already has.
 */
const unapplied = new Map<number, [string, ArrayBuffer[] | undefined]>();

/** Binary prop values of the batch being journalled: a prop holds
 *  `{ $bytes: i }`, and the bytes ride next to the JSON (see encodeValue). */
let batchBytes: ArrayBuffer[] = [];

function flushOps() {
  const b = batch;
  const drained = drainOps();
  if (drained === undefined) return;
  unapplied.set(b, drained);
  const done = () => unapplied.delete(b);
  const [json, bytes] = drained;
  fjs.bridge_call({ channel: "_ops", v: OPS_VERSION, g: generation, b, json, ...(bytes ? { bytes } : {}) })?.then?.(done, done);
}

/** The journal as one JSON string (and its binary values), and a fresh
 *  journal; undefined when there is nothing to send. */
function drainOps(): [string, ArrayBuffer[] | undefined] | undefined {
  flush();
  flushScheduled = false;
  if (ops.length === 0) return;
  if (generation !== (globalThis as any).__fuseGeneration) {
    ops.length = 0;
    return;
  }
  // One JSON string per batch, not an array of op objects: fjs (3.3+) bounds
  // JS→Dart value conversion at 100,000 values, which an op array crosses at
  // roughly 4,500 mounted elements. A string is a single value, and
  // JSON.stringify + jsonDecode is also cheaper than walking the objects.
  let json: string | undefined;
  try {
    json = JSON.stringify(ops);
  } catch (err) {
    // A prop value JSON cannot carry (a cycle, a BigInt). The batch is
    // dropped rather than failing again at every later flush; report it,
    // because the Dart tree is now missing these ops.
    reportDevError(err);
    // Dart never saw the templates this batch defined.
    for (const t of defining) t.batch = -1;
  }
  defining.length = 0;
  ops.length = 0;
  batch++;
  const bytes = batchBytes.length ? batchBytes : undefined;
  if (bytes) batchBytes = [];
  return json === undefined ? undefined : [json, bytes];
}

/** What a synchronous call returns with its result: every batch Dart may
 *  lack, oldest first, then the journal so far. */
function syncOps(): { v: number; g: number; batches: [number, string, ArrayBuffer[]?][] } {
  const b = batch;
  const drained = drainOps();
  const batches: [number, string, ArrayBuffer[]?][] = [];
  for (const [n, [json, bytes]] of unapplied) batches.push(bytes ? [n, json, bytes] : [n, json]);
  unapplied.clear();
  if (drained !== undefined) batches.push(drained[1] ? [b, drained[0], drained[1]] : [b, drained[0]]);
  return { v: OPS_VERSION, g: generation, batches };
}

_setSyncOps(syncOps);

function scheduleFlush() {
  if (flushScheduled || rendering) return;
  flushScheduled = true;
  Promise.resolve().then(flushOps);
}

// Wire up __dispatch auto-flush: after every Dart→JS message, flush Solid effects + ops.
onAfterDispatch(flushOps);

// Let channels.call() drain pending ops before firing the RPC, so the
// ref→handle-method pattern works without users thinking about ordering.
_setFlushOps(flushOps);

// --- Templates ---
//
// The parts of a JSX tree that can never change (element types, literal
// props, literal text, how they nest) are the same every time the JSX is
// evaluated. The compile step (cli/compile-plugin.ts) lifts them out into a
// template: a shape that crosses to Dart once. Mounting the JSX is then one
// `instantiate` op, and JS creates a node only for the places that have
// something dynamic (a "hole": an expression prop, a handler, a ref, dynamic
// children), which Solid's compiler wires up exactly as it would a normal
// element.

/** A shape is `[type, props | 0, ...children]`; a string child is text. */
export type TemplateShape = [string, Record<string, unknown> | 0, ...(TemplateShape | string)[]];

export interface Template {
  id: number;
  shape: TemplateShape;
  /** Number of nodes in the shape. */
  size: number;
  /** The batch that carried (or carries) the definition; -1 if Dart has none. */
  batch: number;
}

let nextTemplate = 0;
/** Templates defined in the unsent batch. */
const defining: Template[] = [];

function template(shape: TemplateShape, size: number): Template {
  return { id: nextTemplate++, shape, size, batch: -1 };
}

/**
 * Journal one instance of `t` and return the id of its root node; node `i`
 * of the shape (document order) is `id + i`.
 */
function instantiate(t: Template): number {
  if (t.batch < 0) {
    t.batch = batch;
    defining.push(t);
    ops.push(DEFINE, t.id, t.shape);
  }
  const id = nextId;
  nextId += t.size;
  ops.push(INSTANTIATE, t.id, id, host.mode !== "release" && _currentComponent ? _currentComponent : null);
  return id;
}

/**
 * The JS node for node `$i` of the template instance rooted at id `$t`. The
 * compile step writes such an element as `<h$view $t={...} $i={...}>`: the
 * `h$` prefix on the tag is what tells it from an element to create.
 */
function hole(tag: string, props: Record<string, unknown>): FuseNode {
  const index = props.$i as number;
  const node = new FuseNode(tag.slice(2), (props.$t as number) + index);
  // The root is inserted by whoever uses the JSX; the rest are in place.
  node.adopt = index !== 0;
  // Props known before the batch leaves ride in one `props` op, added when
  // the first one arrives (see setProperty).
  node.batch = batch;
  for (const name in props) {
    if (name !== "$t" && name !== "$i") setProperty(node, name, props[name]);
  }
  return node;
}

// --- Nodes and props ---

/**
 * Create a node of `type` and journal its `create` op. `props` are the
 * node's initial props: the compiler passes an element's static attributes
 * here (`createElement("view", { width: 40, onTap: f })`), and `createHandle`
 * its options.
 */
function createNode<K extends string>(type: K, props?: Record<string, unknown>): FuseNode<K> {
  const node = new FuseNode(type);
  const createProps: Record<string, any> = {};
  if (host.mode !== "release" && _currentComponent) createProps._component = _currentComponent;
  node.batch = batch;
  node.slot = ops.push(CREATE, node.id, type, createProps) - 1;
  if (props) setCreateProps(node, props);
  return node;
}

function setCreateProps(node: FuseNode, props: Record<string, unknown>) {
  // Plain values first, node references after: a reference ends folding
  // (see setProperty), and every plain prop must be in the `create` op,
  // where a handle factory reads its options.
  let refs: [string, Encoded][] | undefined;
  for (const name in props) {
    const value = props[name];
    if (value == null || typeof value === "function") {
      setProperty(node, name, value);
      continue;
    }
    const e = encodeValue(name, value);
    if (e.refs) (refs ??= []).push([name, e]);
    else applyEncoded(node, name, e);
  }
  if (refs) for (const [name, e] of refs) applyEncoded(node, name, e);
}

// --- Owned handles ---
//
// A handle `createX` makes lives while its reactive owner does, and after
// that for as long as JS can still reach it (it was handed to a parent, or
// kept in a variable): Dart disposes it once both are over. The owner's
// cleanup must not hold the node, or the node could never be collected.

interface Life {
  id: number;
  owned: boolean;
  collected: boolean;
}

const ownedReleased = new FinalizationRegistry<Life>((life) => {
  life.collected = true;
  if (!life.owned) releaseOwned(life);
});

function releaseOwned(life: Life) {
  handlerNodes.delete(life.id);
  ops.push(DISPOSE, life.id);
  scheduleFlush();
}

/** A handle node owned by the current reactive owner (none: by JS alone). */
function createOwnedNode<K extends string>(type: K, props?: Record<string, unknown>): FuseNode<K> {
  const node = createNode(type);
  // Not released by the plain rule (`track`): the owner counts too.
  node.tracked = true;
  const life: Life = { id: node.id, owned: getOwner() !== null, collected: false };
  ownedReleased.register(node, life);
  if (life.owned) {
    const gen = generation;
    onCleanup(() => {
      life.owned = false;
      if (life.collected && gen === (globalThis as any).__fuseGeneration) releaseOwned(life);
    });
  }
  if (props) setCreateProps(node, props);
  scheduleFlush();
  return node;
}

// --- Nodes for objects Dart has ---

/** How values from Dart become JS values: generated.ts turns the handle
 *  references in them into handles. Identity until it is set. */
let decodeIn: (v: any) => any = (v) => v;

function _setDecodeIn(fn: (v: any) => any) {
  decodeIn = fn;
}

const adoptedReleased = new FinalizationRegistry<{ id: number; done: () => void }>(({ id, done }) => {
  if (handlerNodes.get(id)?.deref() === undefined) handlerNodes.delete(id);
  done();
});

/**
 * A node for an object Dart already has under [id] (a handle Dart hands
 * to JS). It journals nothing: [released] runs once JS lets go of it, and
 * must not hold the node.
 */
function adoptNode<K extends string>(type: K, id: number, released: () => void): FuseNode<K> {
  const node = new FuseNode(type, id);
  node.tracked = true;
  adoptedReleased.register(node, { id, done: released });
  return node;
}

/** The live node with [id] that has handlers (every generated handle). */
function nodeById(id: number): FuseNode | undefined {
  return handlerNodes.get(id)?.deref();
}

/** The wire form of a value a channel call carries (no functions). */
function wireOf(value: any): any {
  return value == null ? value : encodeValue("", value, null).wire;
}

/** Registers (or with `undefined`, removes) a function Dart calls by name on
 *  [node] through `_functionCall`, without a prop. */
function setHandler(node: FuseNode, name: string, fn: Function | undefined) {
  if (fn) handlersOf(node)[name] = fn;
  else if (node.handlers) delete node.handlers[name];
}

/** The node a prop value refers to: an orphan JSX node (passed itself) or a
 *  handle (carries `.node`). */
function nodeOf(value: any): FuseNode | null {
  if (value == null || typeof value !== "object") return null;
  if (value instanceof FuseNode) return value;
  return value.node instanceof FuseNode ? value.node : null;
}

/** A prop value as it goes to Dart, with what it holds that Dart calls or
 *  shows: functions and nodes anywhere inside it. */
interface Encoded {
  wire: any;
  refs: FuseNode[] | null;
  fns: Function[] | null;
}

/**
 * The wire form of a prop value.
 *
 * - JSON has no Infinity or NaN: `JSON.stringify` writes them as `null`,
 *   which would turn `width={Infinity}` into "no width". They cross as the
 *   strings "Infinity", "-Infinity" and "NaN", which Dart's number readers
 *   (`FuseMap.double`, `decDouble`) read back.
 * - A node (an orphan JSX element, or a handle's `.node`) inside a value
 *   becomes `{ _node: id }`, the same shape as a node prop.
 * - A function inside a value becomes `{ $fn: "<prop>#<i>" }`, a handler
 *   name Dart calls through `_functionCall`.
 * - Binary data (an ArrayBuffer or a view of one) becomes `{ $bytes: i }`
 *   and its bytes go in [bytes], which rides next to the batch's JSON. With
 *   no [bytes] (a value a channel carries, which takes bytes as they are),
 *   it stays.
 *
 * Returns `value` itself unless something inside it had to change, so the
 * common case allocates nothing.
 */
function encodeValue(name: string, value: any, bytes: ArrayBuffer[] | null = batchBytes): Encoded {
  const e: Encoded = { wire: value, refs: null, fns: null };
  const walk = (v: any, depth: number): any => {
    if (typeof v === "number") return v === v && v !== Infinity && v !== -Infinity ? v : String(v);
    if (typeof v === "function") return { $fn: `${name}#${(e.fns ??= []).push(v) - 1}` };
    // Depth-bounded: a cyclic value is left for JSON.stringify to reject.
    if (v === null || typeof v !== "object" || depth > 16) return v;
    if (v instanceof ArrayBuffer) return bytes ? { $bytes: bytes.push(v.slice(0)) - 1 } : v;
    if (ArrayBuffer.isView(v)) {
      if (!bytes) return v;
      return { $bytes: bytes.push(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer) - 1 };
    }
    const ref = nodeOf(v);
    if (ref) {
      (e.refs ??= []).push(ref);
      return { _node: ref.id };
    }
    let out: any;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const item = v[i];
        const encoded = walk(item, depth + 1);
        if (encoded !== item) (out ??= v.slice())[i] = encoded;
      }
    } else {
      for (const key in v) {
        const item = v[key];
        const encoded = walk(item, depth + 1);
        if (encoded !== item) (out ??= { ...v })[key] = encoded;
      }
    }
    return out ?? v;
  };
  e.wire = walk(value, 0);
  return e;
}

function setProperty(node: FuseNode, name: string, value: any) {
  if (typeof value === "function") {
    setNested(node, name, null);
    if (node.refs) delete node.refs[name];
    handlersOf(node)[name] = value;
    applyWire(node, name, true);
    return;
  }
  applyEncoded(node, name, value == null ? { wire: value, refs: null, fns: null } : encodeValue(name, value));
}

function handlersOf(node: FuseNode): Record<string, Function> {
  let handlers = node.handlers;
  if (handlers === undefined) {
    handlers = node.handlers = {};
    node.owner = getOwner();
    handlerNodes.set(node.id, new WeakRef(node));
    track(node);
  }
  return handlers;
}

/** Replaces the functions registered from inside prop [name]'s value. */
function setNested(node: FuseNode, name: string, fns: Function[] | null) {
  const before = node.nested?.[name] ?? 0;
  if (before === 0 && fns === null) return;
  const handlers = handlersOf(node);
  for (let i = fns?.length ?? 0; i < before; i++) delete handlers[`${name}#${i}`];
  if (fns) {
    for (let i = 0; i < fns.length; i++) handlers[`${name}#${i}`] = fns[i];
    (node.nested ??= {})[name] = fns.length;
  } else {
    delete node.nested![name];
  }
}

function applyEncoded(node: FuseNode, name: string, e: Encoded) {
  setNested(node, name, e.fns);
  if (e.refs) {
    // A node reference, or nodes inside the value.
    const top = e.refs.length === 1 && e.wire?._node === e.refs[0].id && nodeOf(e.wire) === null;
    (node.refs ??= {})[name] = top ? e.refs[0] : e.refs;
    for (const ref of e.refs) track(ref);
    // Never folded into `create`: the referenced node may be created
    // later in this batch than the node that points at it.
    // From here on this node's props go out as ops, in order.
    node.batch = -1;
    ops.push(SET_PROP, node.id, name, e.wire);
    scheduleFlush();
    return;
  }
  if (node.refs) delete node.refs[name];
  applyWire(node, name, e.wire);
}

function applyWire(node: FuseNode, name: string, wire: any) {
  if (node.batch === batch) {
    // The node's `create` op has not left JS yet: the prop rides in it.
    // Static attributes, a wrapper's spread and the first run of a dynamic
    // binding all land here, so mounting an element is one op, not one per
    // prop. A template hole has no `create` op and gets a `props` op.
    if (node.slot < 0) node.slot = ops.push(PROPS, node.id, {}) - 1;
    (ops[node.slot] as Record<string, any>)[name] = wire;
  } else {
    ops.push(SET_PROP, node.id, name, wire);
  }
  // Like insertNode/removeNode/replaceText: schedule a flush so the op is
  // sent. Without this, a prop-only reactive update that runs after a
  // dispatch's flush (e.g. an async `.then(setState)`) buffers an op that
  // nothing sends until the next event.
  scheduleFlush();
}

// --- Renderer ---

const {
  render: innerRender,
  effect,
  memo,
  createComponent: innerCreateComponent,
  createElement,
  createTextNode,
  insertNode: innerInsertNode,
  insert,
  spread: universalSpread,
  setProp,
  mergeProps,
  ...rest
} = createRenderer<FuseNode>({
  createElement(tag: string, staticProps?: Record<string, unknown>) {
    // "h$": charCodes 104, 36.
    return tag.charCodeAt(1) === 36 && tag.charCodeAt(0) === 104
      ? hole(tag, staticProps!)
      : createNode(tag, staticProps);
  },

  createTextNode(value: string) {
    const node = new FuseNode("__text__");
    ops.push(TEXT, node.id, value);
    return node;
  },

  replaceText(node: FuseNode, value: string) {
    ops.push(SET_TEXT, node.id, value);
    scheduleFlush();
  },

  isTextNode(node: FuseNode) {
    return node.type === "__text__";
  },

  setProperty,

  insertNode(parent: FuseNode, node: FuseNode, anchor?: FuseNode) {
    if (node === anchor) return;
    // Inserting an attached node moves it, as `insertBefore` does in the DOM:
    // Solid's keyed reconciler relies on that when it reorders a list. Dart's
    // `insert` detaches too, so a move needs no `remove` op.
    if (node.parent) unlink(node);
    if (anchor && anchor.parent !== parent) anchor = undefined;
    node.parent = parent;
    if (anchor) {
      const prev = anchor.prev;
      node.prev = prev;
      node.next = anchor;
      anchor.prev = node;
      if (prev) prev.next = node;
      else parent.first = node;
    } else {
      const last = parent.last;
      node.prev = last;
      parent.last = node;
      if (last) last.next = node;
      else parent.first = node;
    }
    if (node.adopt) {
      node.adopt = false;
      return;
    }
    ops.push(INSERT, parent.id, node.id, anchor ? anchor.id : null);
    scheduleFlush();
  },

  removeNode(parent: FuseNode, node: FuseNode) {
    // Not (or no longer) a child of `parent`: nothing to detach.
    if (node.parent !== parent) return;
    unlink(node);
    track(node);
    ops.push(REMOVE, node.id);
    scheduleFlush();
  },

  getParentNode(node: FuseNode) {
    return node.parent;
  },

  getFirstChild(node: FuseNode) {
    return node.first;
  },

  getNextSibling(node: FuseNode) {
    return node.next;
  },
});

/** Take an attached node out of its parent's child list. */
function unlink(node: FuseNode) {
  const parent = node.parent!;
  const { prev, next } = node;
  if (prev) prev.next = next;
  else parent.first = next;
  if (next) next.prev = prev;
  else parent.last = prev;
  node.parent = node.prev = node.next = undefined;
}

/** Journal the disposal of a node that was never part of the tree (a handle). */
function disposeNode(node: FuseNode) {
  ops.push(DISPOSE, node.id);
  scheduleFlush();
}

function createComponent(Comp: any, props: any) {
  if (host.mode === 'release') return innerCreateComponent(Comp, props);
  const prev = _currentComponent;
  const name = (Comp.name || "").replace(/^\[.*?\]/, "");
  _currentComponent = name || undefined;
  try {
    return innerCreateComponent(Comp, props);
  } finally {
    _currentComponent = prev;
  }
}

// --- Public render function ---

export function render(code: () => any) {
  rendering = true;
  let dispose: any;
  try {
    dispose = innerRender(code, root);
  } catch (err) {
    // Report and swallow — don't crash the engine. HMR can recover once
    // the offending code is fixed. Matches Vite's browser-side behaviour.
    rendering = false;
    reportDevError(err);
    return () => {};
  }
  rendering = false;
  flushOps();
  return () => {
    if (typeof dispose === "function") dispose();
    for (let child = root.first; child; child = root.first) {
      unlink(child);
      ops.push(DISPOSE, child.id);
    }
    handlerNodes.clear();
    scheduleFlush();
  };
}

const insertNode = innerInsertNode;
const { ref, applyRef } = rest;

/**
 * `<tag {...props} />` — what every wrapper component (`View`, `Text`, a
 * package's own) compiles to.
 *
 * The universal `spread` runs one render effect that copies every prop and
 * diffs the copy, whatever the props are. But a props object written in JSX
 * is a plain object in which the compiler has already classified each prop:
 * a literal is a data property, an expression is a getter (the contract
 * behind Solid's `isStatic`). So for a plain object the work is decided per
 * key, once:
 *
 * - a data property cannot change: set it now, with no effect (it rides in
 *   the node's `create` op);
 * - the getters share one effect;
 * - `children` is inserted statically unless it is a getter.
 *
 * Anything proxy-backed (a store, `merge()`/`omit()` views) can gain and
 * lose keys, and an array of sources needs merging: those keep the universal
 * implementation.
 */
function spread(
  node: FuseNode,
  props: any,
  skipChildren?: boolean,
  options?: RendererEffectOptions,
): void {
  if (props === null || typeof props !== "object" || Array.isArray(props) || $PROXY in props) {
    universalSpread(node, props, skipChildren, options);
    return;
  }
  let dynamic: string[] | undefined;
  for (const key in props) {
    const desc = Object.getOwnPropertyDescriptor(props, key);
    // An inherited property has no own descriptor: treat it as dynamic.
    const isDynamic = desc === undefined || desc.get !== undefined;
    if (key === "children") {
      if (!skipChildren) {
        insert(node, isDynamic ? () => props.children : desc.value, undefined, undefined, options);
      }
    } else if (isDynamic) {
      (dynamic ??= []).push(key);
    } else if (key === "ref") {
      applySpreadRef(node, desc.value);
    } else {
      setProperty(node, key, desc.value);
    }
  }
  if (dynamic === undefined) return;
  const keys = dynamic;
  const prev: Record<string, any> = {};
  effect(
    () => {
      const next: Record<string, any> = {};
      for (let i = 0; i < keys.length; i++) next[keys[i]] = props[keys[i]];
      return next;
    },
    (next: Record<string, any>) => {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = next[key];
        if (value === prev[key]) continue;
        if (key === "ref") applySpreadRef(node, value);
        else setProperty(node, key, value);
        prev[key] = value;
      }
    },
    options,
  );
}

function applySpreadRef(node: FuseNode, value: any) {
  if (typeof value === "function" || Array.isArray(value)) ref(() => value, node);
}

export {
  effect,
  memo,
  createComponent,
  createElement,
  createTextNode,
  insertNode,
  insert,
  spread,
  setProp,
  mergeProps,
  flushOps,
  ref,
  applyRef,
  createNode,
  createOwnedNode,
  adoptNode,
  nodeById,
  wireOf,
  _setDecodeIn,
  setHandler,
  disposeNode,
  template,
  instantiate,
  scheduleFlush,
};

// Re-export Solid control flow and flush
export { flush, For, Show, Switch, Match, Errored, Loading, Repeat, Reveal } from "solid-js";
