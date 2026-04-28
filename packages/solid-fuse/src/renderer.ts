import { createRenderer } from "@solidjs/universal";
import { flush } from "solid-js";
import { send, on, onAfterDispatch, _setFlushOps } from "~/channels";

let nextId = 0;
let _currentComponent: string | undefined;

export class FuseNode<K extends string = string> {
  id = nextId++;
  props: Record<string, any> = {};
  children: FuseNode[] = [];
  parent: FuseNode | undefined = undefined;

  constructor(public type: K) {}
}

// --- Event handler registry ---

const handlers = new Map<string, Function>();

// Register the function call channel — Dart calls JS functions via channels.send('_functionCall', ...)
on("_functionCall", (data: { nodeId: number; name: string; value?: any }) => {
  const handler = handlers.get(`${data.nodeId}:${data.name}`);
  handler?.(data.value);
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

// --- Auto-flush machinery ---

const root: FuseNode = new FuseNode("root");
let flushScheduled = false;
let rendering = false;

function flushOps() {
  flush(); // Process pending Solid effects first
  flushScheduled = false;
  if (ops.length === 0) return;
  send("_ops", { ops: ops.slice() });
  ops.length = 0;
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
  createElement(tag: string) {
    const node = new FuseNode(tag);
    const createProps: Record<string, any> = {};
    if (flutterMode !== 'release' && _currentComponent) createProps._component = _currentComponent;
    ops.push({ op: "create", id: node.id, type: tag, props: createProps });
    return node;
  },

  createTextNode(value: string) {
    const node = new FuseNode("__text__");
    node.props.text = value;
    ops.push({
      op: "create",
      id: node.id,
      type: "__text__",
      props: { text: value },
    });
    return node;
  },

  replaceText(node: FuseNode, value: string) {
    node.props.text = value;
    ops.push({ op: "setText", id: node.id, text: value });
    scheduleFlush();
  },

  isTextNode(node: FuseNode) {
    return node.type === "__text__";
  },

  setProperty(node: FuseNode, name: string, value: any) {
    if (typeof value === "function") {
      handlers.set(`${node.id}:${name}`, value);
      node.props[name] = true;
      ops.push({ op: "setProp", id: node.id, name, value: true });
      return;
    }
    const ref = value instanceof FuseNode
      ? value
      : value?.node instanceof FuseNode
        ? value.node
        : null;
    if (ref) {
      // Orphan JSX node (passed itself) or a handle (carries `.node`).
      // Same wire shape either way.
      node.props[name] = value;
      ops.push({ op: "setProp", id: node.id, name, value: { _node: ref.id } });
      return;
    }
    node.props[name] = value;
    ops.push({ op: "setProp", id: node.id, name, value });
  },

  insertNode(parent: FuseNode, node: FuseNode, anchor?: FuseNode) {
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
  if (flutterMode === 'release') return innerCreateComponent(Comp, props);
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
  const dispose = innerRender(code, root);
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
  scheduleFlush,
};

// Re-export Solid control flow and flush
export { flush, For, Show, Switch, Match } from "solid-js";
