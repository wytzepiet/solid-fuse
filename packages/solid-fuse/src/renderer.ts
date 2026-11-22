import { createRenderer } from "@solidjs/universal";
import { flush } from "solid-js";
import { send, on, onAfterDispatch, _setFlushOps } from "~/channels";
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
  declare children: FuseNode[];
  declare parent: FuseNode | undefined;
  /** The props object of this node's `create` op, while that op is unsent. */
  declare created: Record<string, any> | undefined;
  /** The batch the `create` op was journalled in. */
  declare batch: number;

  constructor(type: K) {
    this.id = nextId++;
    this.type = type;
    this.children = [];
    this.parent = undefined;
    this.created = undefined;
    this.batch = -1;
  }
}

// --- Event handler registry ---

const handlers = new Map<string, Function>();

// Register the function call channel — Dart calls JS functions via channels.send('_functionCall', ...)
on("_functionCall", (data: { nodeId: number; name: string; value?: any }) => {
  const key = `${data.nodeId}:${data.name}`;
  handlers.get(key)?.(data.value);
});

// --- Ops journal ---

type Op =
  | { op: "create"; id: number; type: string; props: Record<string, any> }
  | { op: "setText"; id: number; text: string }
  | { op: "setProp"; id: number; name: string; value: any }
  | { op: "insert"; parentId: number; childId: number; index: number }
  | { op: "remove"; parentId: number; childId: number }
  | { op: "dispose"; id: number };

const ops: Op[] = [];
/** Number of the batch being journalled; bumped each time one is sent. */
let batch = 0;

// --- Auto-flush machinery ---

const root: FuseNode = new FuseNode("root");
let flushScheduled = false;
let rendering = false;

function flushOps() {
  flush();
  flushScheduled = false;
  if (ops.length === 0) return;
  // One JSON string per batch, not an array of op objects: fjs (3.3+) bounds
  // JS→Dart value conversion at 100,000 values, which an op array crosses at
  // roughly 4,500 mounted elements. A string is a single value, and
  // JSON.stringify + jsonDecode is also cheaper than walking the objects.
  send("_ops", { json: JSON.stringify(ops) });
  ops.length = 0;
  batch++;
}

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
  node.created = createProps;
  node.batch = batch;
  ops.push({ op: "create", id: node.id, type, props: createProps });
  if (props) for (const name in props) setProperty(node, name, props[name]);
  return node;
}

function setProperty(node: FuseNode, name: string, value: any) {
  let wire = value;
  if (typeof value === "function") {
    handlers.set(`${node.id}:${name}`, value);
    wire = true;
  } else if (value != null) {
    // A node reference: an orphan JSX node (passed itself) or a handle
    // (carries `.node`) — same wire shape either way.
    const ref = value instanceof FuseNode
      ? value
      : value.node instanceof FuseNode
        ? value.node
        : null;
    if (ref) {
      // Never folded into `create`: the referenced node may be created
      // later in this batch than the node that points at it.
      // From here on this node's props go out as ops, in order.
      node.batch = -1;
      ops.push({ op: "setProp", id: node.id, name, value: { _node: ref.id } });
      scheduleFlush();
      return;
    }
  }
  if (node.batch === batch) {
    // The node's `create` op has not left JS yet: the prop rides in it.
    // Static attributes, a wrapper's spread and the first run of a dynamic
    // binding all land here, so mounting an element is one op, not one per
    // prop.
    node.created![name] = wire;
  } else {
    ops.push({ op: "setProp", id: node.id, name, value: wire });
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
  spread,
  setProp,
  mergeProps,
  ...rest
} = createRenderer<FuseNode>({
  createElement(tag: string, staticProps?: Record<string, unknown>) {
    return createNode(tag, staticProps);
  },

  createTextNode(value: string) {
    const node = new FuseNode("__text__");
    ops.push({ op: "create", id: node.id, type: "__text__", props: { text: value } });
    return node;
  },

  replaceText(node: FuseNode, value: string) {
    ops.push({ op: "setText", id: node.id, text: value });
    scheduleFlush();
  },

  isTextNode(node: FuseNode) {
    return node.type === "__text__";
  },

  setProperty,

  insertNode(parent: FuseNode, node: FuseNode, anchor?: FuseNode) {
    // Inserting an attached node moves it, as `insertBefore` does in the DOM:
    // Solid's keyed reconciler relies on that when it reorders a list. Detach
    // first so the node is never listed twice. Dart's `insert` does the same,
    // so a move needs no `remove` op.
    const oldParent = node.parent;
    if (oldParent) {
      const old = oldParent.children.indexOf(node);
      if (old >= 0) oldParent.children.splice(old, 1);
    }
    node.parent = parent;
    let index: number;
    if (anchor) {
      const idx = parent.children.indexOf(anchor);
      if (idx >= 0) {
        parent.children.splice(idx, 0, node);
        index = idx;
      } else {
        parent.children.push(node);
        index = parent.children.length - 1;
      }
    } else {
      parent.children.push(node);
      index = parent.children.length - 1;
    }
    ops.push({ op: "insert", parentId: parent.id, childId: node.id, index });
    scheduleFlush();
  },

  removeNode(parent: FuseNode, node: FuseNode) {
    // Not (or no longer) a child of `parent`: nothing to detach.
    if (node.parent !== parent) return;
    const idx = parent.children.indexOf(node);
    if (idx >= 0) parent.children.splice(idx, 1);
    node.parent = undefined;
    ops.push({ op: "remove", parentId: parent.id, childId: node.id });
    scheduleFlush();
  },

  getParentNode(node: FuseNode) {
    return node.parent;
  },

  getFirstChild(node: FuseNode) {
    return node.children[0];
  },

  getNextSibling(node: FuseNode) {
    const parent = node.parent;
    if (!parent) return undefined;
    const idx = parent.children.indexOf(node);
    return parent.children[idx + 1];
  },
});

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
    for (const child of root.children) {
      ops.push({ op: "remove", parentId: root.id, childId: child.id });
    }
    root.children = [];
    handlers.clear();
  };
}

const insertNode = innerInsertNode;
const ref: (fn: () => any, element: FuseNode) => void = (rest as any).ref;

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
  ops,
  createNode,
  scheduleFlush,
};

// Re-export Solid control flow and flush
export { flush, For, Show, Switch, Match, Errored, Loading } from "solid-js";
