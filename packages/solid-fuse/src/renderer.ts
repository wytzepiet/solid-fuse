import { createRenderer } from "@solidjs/universal";
import { flush } from "solid-js";
import { send, on, onAfterDispatch } from "~/channels";

export interface FuseNode {
  type: string;
  props: Record<string, any>;
  children: FuseNode[];
  _parent: FuseNode | undefined;
}

let nextId = 0;
let _currentComponent: string | undefined;

function makeNode(type: string): FuseNode {
  return {
    type,
    props: { _id: nextId++ },
    children: [],
    _parent: undefined,
  };
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
  | { op: "call"; id: number; method: string; value?: any }
  | { op: "dispose"; id: number };

const ops: Op[] = [];

// --- Auto-flush machinery ---

const root: FuseNode = makeNode("root");
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
    const node = makeNode(tag);
    const createProps: Record<string, any> = { _id: node.props._id };
    if (flutterMode !== 'release' && _currentComponent) createProps._component = _currentComponent;
    ops.push({ op: "create", id: node.props._id, type: tag, props: createProps });
    return node;
  },

  createTextNode(value: string) {
    const node = makeNode("__text__");
    node.props.text = value;
    ops.push({
      op: "create",
      id: node.props._id,
      type: "__text__",
      props: { _id: node.props._id, text: value },
    });
    return node;
  },

  replaceText(node: FuseNode, value: string) {
    node.props.text = value;
    ops.push({ op: "setText", id: node.props._id, text: value });
    scheduleFlush();
  },

  isTextNode(node: FuseNode) {
    return node.type === "__text__";
  },

  setProperty(node: FuseNode, name: string, value: any) {
    if (typeof value === "function") {
      handlers.set(`${node.props._id}:${name}`, value);
      node.props[name] = true;
      ops.push({ op: "setProp", id: node.props._id, name, value: true });
    } else if (value != null && typeof value === "object" && value._ref !== undefined) {
      node.props[name] = value;
      ops.push({ op: "setProp", id: node.props._id, name, value: { _ref: value._ref } });
    } else {
      node.props[name] = value;
      ops.push({ op: "setProp", id: node.props._id, name, value });
    }
  },

  insertNode(parent: FuseNode, node: FuseNode, anchor?: FuseNode) {
    node._parent = parent;
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
    ops.push({ op: "insert", parentId: parent.props._id, childId: node.props._id, index });
    scheduleFlush();
  },

  removeNode(parent: FuseNode, node: FuseNode) {
    const idx = parent.children.indexOf(node);
    if (idx >= 0) parent.children.splice(idx, 1);
    node._parent = undefined;
    ops.push({ op: "remove", parentId: parent.props._id, childId: node.props._id });
    scheduleFlush();
  },

  getParentNode(node: FuseNode) {
    return node._parent;
  },

  getFirstChild(node: FuseNode) {
    return node.children[0];
  },

  getNextSibling(node: FuseNode) {
    const parent = node._parent;
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
      ops.push({ op: "remove", parentId: root.props._id, childId: child.props._id });
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
  makeNode,
};

// Re-export Solid control flow and flush
export { flush, For, Show, Switch, Match } from "solid-js";
