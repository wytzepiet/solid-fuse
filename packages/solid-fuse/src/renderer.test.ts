import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createRoot, createSignal, createStore, flush, For, onCleanup as onCleanupFn } from "solid-js";

// Run through `bun run test` (or `bun test --conditions browser`): by default
// Bun resolves solid-js to its server build, where nothing is reactive.
//
// The renderer talks to the host through two globals; stub both before it loads.
const sent: any[] = [];
(globalThis as any).__fuseHost = { mode: "release", platform: "linux", brightness: "light" };
(globalThis as any).fjs = {
  bridge_call: (msg: any) => (sent.push(msg), Promise.resolve(null)),
};

let R: typeof import("./renderer");
beforeAll(async () => {
  R = await import("./renderer");
});
beforeEach(() => {
  R.flushOps();
  sent.length = 0;
});

// Each test renders into the one root; unmount afterwards so the next test
// starts with an empty root.
const disposers: (() => void)[] = [];
function mount(code: () => any) {
  disposers.push(R.render(code));
}
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

type Op = Record<string, any>;

/** Flush and return every op sent since the last call. */
function takeOps(): Op[] {
  R.flushOps();
  const out: Op[] = [];
  for (const m of sent) {
    if (m.channel !== "_ops") continue;
    expect(m.v).toBe(4);
    out.push(...decode(JSON.parse(m.json)));
  }
  sent.length = 0;
  return out;
}

/** The flat journal (opcode, operands, opcode, ...) as one object per op. */
function decode(flat: any[]): Op[] {
  const out: Op[] = [];
  for (let i = 0; i < flat.length; ) {
    switch (flat[i]) {
      case 0: out.push({ op: "create", id: flat[i + 1], type: flat[i + 2], props: flat[i + 3] }); i += 4; break;
      case 1: out.push({ op: "text", id: flat[i + 1], text: flat[i + 2] }); i += 3; break;
      case 2: out.push({ op: "setProp", id: flat[i + 1], name: flat[i + 2], value: flat[i + 3] }); i += 4; break;
      case 3: out.push({ op: "setText", id: flat[i + 1], text: flat[i + 2] }); i += 3; break;
      case 4: out.push({ op: "insert", parentId: flat[i + 1], childId: flat[i + 2], before: flat[i + 3] }); i += 4; break;
      case 5: out.push({ op: "remove", childId: flat[i + 1] }); i += 2; break;
      case 6: out.push({ op: "dispose", id: flat[i + 1] }); i += 2; break;
      case 7: out.push({ op: "define", template: flat[i + 1], shape: flat[i + 2] }); i += 3; break;
      case 8: out.push({ op: "instantiate", template: flat[i + 1], id: flat[i + 2], component: flat[i + 3] }); i += 4; break;
      case 9: out.push({ op: "props", id: flat[i + 1], props: flat[i + 2] }); i += 3; break;
      default: throw new Error(`unknown opcode ${flat[i]} at ${i}`);
    }
  }
  return out;
}

/**
 * What `FuseRuntime.applyOps` (dart/lib/src/runtime.dart) does to the child
 * lists, so a test can check the tree Dart ends up with, not only the mirror.
 */
class DartTree {
  children = new Map<number, number[]>([[0, []]]);
  parent = new Map<number, number>();
  apply(ops: Op[]) {
    for (const op of ops) {
      if (op.op === "create" || op.op === "text") this.children.set(op.id, []);
      else if (op.op === "insert") {
        this.detach(op.childId);
        const list = this.children.get(op.parentId)!;
        const at = op.before === null ? -1 : list.indexOf(op.before);
        list.splice(at < 0 ? list.length : at, 0, op.childId);
        this.parent.set(op.childId, op.parentId);
      } else if (op.op === "remove") {
        this.detach(op.childId);
      }
    }
  }
  private detach(id: number) {
    const p = this.parent.get(id);
    if (p === undefined) return;
    const list = this.children.get(p)!;
    list.splice(list.indexOf(id), 1);
    this.parent.delete(id);
  }
}

const ids = (n: InstanceType<typeof R.FuseNode>) => n.children.map((c) => c.id);

describe("insertNode / removeNode", () => {
  test("inserting an attached node moves it: no duplicate in the mirror", () => {
    const parent = R.createElement("view");
    const [a, b, c] = [R.createElement("a"), R.createElement("b"), R.createElement("c")];
    for (const n of [a, b, c]) R.insertNode(parent, n);
    takeOps();

    R.insertNode(parent, c, a);
    expect(parent.children).toEqual([c, a, b]);
    R.insertNode(parent, c);
    expect(parent.children).toEqual([a, b, c]);
    expect(takeOps()).toEqual([
      { op: "insert", parentId: parent.id, childId: c.id, before: a.id },
      { op: "insert", parentId: parent.id, childId: c.id, before: null },
    ]);
  });

  test("first/last/prev/next stay consistent through edits", () => {
    const parent = R.createElement("view");
    const [a, b, c] = [R.createElement("a"), R.createElement("b"), R.createElement("c")];
    R.insertNode(parent, b);
    R.insertNode(parent, a, b);
    R.insertNode(parent, c);
    expect([parent.first, parent.last]).toEqual([a, c]);
    expect([a.prev, a.next, b.prev, b.next, c.prev, c.next]).toEqual([undefined, b, a, c, b, undefined]);
    R.insertNode(parent, a); // move the head to the tail
    expect(parent.children).toEqual([b, c, a]);
    expect([parent.first, parent.last, b.prev, a.next, a.prev]).toEqual([b, a, undefined, undefined, c]);
    R.insertNode(parent, a, a); // before itself: no-op
    expect(parent.children).toEqual([b, c, a]);
  });

  test("an anchor that is not a child of the parent means append", () => {
    const [p1, p2] = [R.createElement("view"), R.createElement("view")];
    const [a, b, stranger] = [R.createElement("a"), R.createElement("b"), R.createElement("c")];
    R.insertNode(p2, stranger);
    R.insertNode(p1, a);
    takeOps();
    R.insertNode(p1, b, stranger);
    expect(p1.children).toEqual([a, b]);
    expect(takeOps()).toEqual([{ op: "insert", parentId: p1.id, childId: b.id, before: null }]);
  });

  test("inserting under another parent detaches from the old one", () => {
    const [p1, p2, n] = [R.createElement("view"), R.createElement("view"), R.createElement("a")];
    R.insertNode(p1, n);
    R.insertNode(p2, n);
    expect(p1.children).toEqual([]);
    expect(p2.children).toEqual([n]);
    expect(n.parent).toBe(p2);
  });

  test("removeNode ignores a node that is not a child of that parent", () => {
    const [p1, p2, n] = [R.createElement("view"), R.createElement("view"), R.createElement("a")];
    R.insertNode(p1, n);
    takeOps();
    // The universal renderer exposes no removeNode; drive it through insert().
    const [show, setShow] = createSignal(true);
    mount(() => {
      R.insert(p2, () => (show() ? n : undefined));
      return p2;
    });
    expect(n.parent).toBe(p2);
    takeOps();
    setShow(false);
    flush();
    expect(p2.children).toEqual([]);
    expect(n.parent).toBeUndefined();
    expect(takeOps()).toEqual([{ op: "remove", childId: n.id }]);
  });
});

describe("keyed list moves", () => {
  function mountList(n: number) {
    const [rows, setRows] = createSignal(Array.from({ length: n }, (_, i) => ({ key: i })));
    const byKey = new Map<number, number>(); // row key → node id
    let list!: InstanceType<typeof R.FuseNode>;
    const tree = new DartTree();
    mount(() => {
      list = R.createElement("view");
      R.insert(
        list,
        R.createComponent(For as any, {
          get each() {
            return rows();
          },
          children: (row: { key: number }) => {
            const el = R.createElement("text");
            byKey.set(row.key, el.id);
            return el;
          },
        }),
      );
      return list;
    });
    tree.apply(takeOps());
    const check = (next: { key: number }[]) => {
      setRows(next);
      flush();
      const ops = takeOps();
      tree.apply(ops);
      const want = next.map((r) => byKey.get(r.key)!);
      expect(ids(list)).toEqual(want); // JS mirror
      expect(tree.children.get(list.id)).toEqual(want); // what Dart builds from the ops
      return ops;
    };
    return { rows, check };
  }

  // Deterministic pseudo-random order.
  function shuffled<T>(a: T[], seed: number): T[] {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  test("reverse, swap, rotate keep mirror and Dart order in step", () => {
    const { rows, check } = mountList(6);
    const r0 = rows();
    check(r0.slice().reverse());
    check([r0[0], r0[4], r0[2], r0[3], r0[1], r0[5]]);
    check([r0[5], r0[0], r0[1], r0[2], r0[3], r0[4]]);
    check(r0);
  });

  test("a move creates and disposes nothing", () => {
    const { rows, check } = mountList(50);
    const ops = check(shuffled(rows(), 7));
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.filter((o) => o.op === "create" || o.op === "dispose")).toEqual([]);
  });

  test("repeated shuffles, filters and re-adds never duplicate a child", () => {
    const { rows, check } = mountList(200);
    const all = rows();
    for (let round = 1; round <= 5; round++) check(shuffled(all, round));
    check(all.filter((r) => r.key % 2 === 0));
    check(shuffled(all, 99)); // odd rows are new nodes, even rows move
    check(all.slice().sort((a, b) => a.key - b.key));
    check([]);
  });
});

describe("props", () => {
  test("static props passed to createElement ride in the create op", () => {
    const el = R.createElement("view", { width: 40, flex: { gap: 4 }, color: "red" });
    expect(takeOps()).toEqual([
      { op: "create", id: el.id, type: "view", props: { width: 40, flex: { gap: 4 }, color: "red" } },
    ]);
  });

  test("a static function prop is registered as a handler and sent as true", async () => {
    let got: any;
    const el = R.createElement("view", { onTap: (v: any) => (got = v) });
    expect(takeOps()).toEqual([{ op: "create", id: el.id, type: "view", props: { onTap: true } }]);
    await (globalThis as any).__dispatch("_functionCall", { nodeId: el.id, name: "onTap", value: 7 });
    expect(got).toBe(7);
  });

  test("functions and nodes inside a value cross as handler names and node ids", async () => {
    let got: any;
    const child = R.createElement("text");
    const el = R.createElement("view", {
      items: [{ label: "a", onTap: (v: any) => (got = ["a", v]) }, { label: "b", icon: child, onTap: () => (got = "b") }],
    });
    const ops = takeOps();
    // Plain props ride in `create`; a value with a node inside is a setProp after it.
    expect(ops).toEqual([
      { op: "create", id: child.id, type: "text", props: {} },
      { op: "create", id: el.id, type: "view", props: {} },
      {
        op: "setProp",
        id: el.id,
        name: "items",
        value: [{ label: "a", onTap: { $fn: "items#0" } }, { label: "b", icon: { _node: child.id }, onTap: { $fn: "items#1" } }],
      },
    ]);
    await (globalThis as any).__dispatch("_functionCall", { nodeId: el.id, name: "items#0", value: 3 });
    expect(got).toEqual(["a", 3]);
    // A new value replaces the old functions: one left, the second gone.
    R.setProp(el, "items", [{ onTap: () => (got = "c") }]);
    expect(takeOps()).toEqual([{ op: "setProp", id: el.id, name: "items", value: [{ onTap: { $fn: "items#0" } }] }]);
    expect(Object.keys(el.handlers!)).toEqual(["items#0"]);
    await (globalThis as any).__dispatch("_functionCall", { nodeId: el.id, name: "items#0" });
    expect(got).toBe("c");
  });

  test("a call with reply waits for the handler and answers with its value or error", async () => {
    const el = R.createElement("view", {
      onLoad: async (v: number) => ({ n: v * 2, inf: Infinity }),
      onFail: async () => {
        throw new Error("nope");
      },
    });
    takeOps();
    const dispatch = (globalThis as any).__dispatch;
    expect(await dispatch("_functionCall", { nodeId: el.id, name: "onLoad", value: 2, reply: true })).toEqual({
      value: { n: 4, inf: "Infinity" },
    });
    expect(await dispatch("_functionCall", { nodeId: el.id, name: "onFail", reply: true })).toEqual({ error: "nope" });
  });

  test("a call with args (a Dart callback with several parameters) spreads them", async () => {
    let got: any[] = [];
    const el = R.createElement("view", { onPair: (...a: any[]) => (got = a) });
    takeOps();
    await (globalThis as any).__dispatch("_functionCall", { nodeId: el.id, name: "onPair", args: [1, "b"] });
    expect(got).toEqual([1, "b"]);
  });

  test("props set before the batch is sent fold into create; later ones are setProp ops", () => {
    const [w, setW] = createSignal(1);
    let el!: InstanceType<typeof R.FuseNode>;
    mount(() => {
      el = R.createElement("view", { height: 2 });
      R.effect(w, (v: number, p?: number) => void R.setProp(el, "width", v, p));
      return el;
    });
    expect(takeOps()).toEqual([
      { op: "create", id: el.id, type: "view", props: { height: 2, width: 1 } },
      { op: "insert", parentId: 0, childId: el.id, before: null },
    ]);
    setW(5);
    flush();
    expect(takeOps()).toEqual([{ op: "setProp", id: el.id, name: "width", value: 5 }]);
  });

  test("a node-reference prop is a setProp op after both creates", () => {
    const owner = R.createElement("view");
    const orphan = R.createElement("icon");
    R.setProp(owner, "leading", orphan);
    R.setProp(owner, "width", 3);
    // Props set after the reference stay in order behind it.
    expect(takeOps()).toEqual([
      { op: "create", id: owner.id, type: "view", props: {} },
      { op: "create", id: orphan.id, type: "icon", props: {} },
      { op: "setProp", id: owner.id, name: "leading", value: { _node: orphan.id } },
      { op: "setProp", id: owner.id, name: "width", value: 3 },
    ]);
  });

  test("createNode puts every plain prop in create, even after a node reference", () => {
    const target = R.createNode("scrollController");
    const node = R.createNode("pageController", { linked: { node: target }, initialPage: 2, onPage: () => {} });
    expect(takeOps()).toEqual([
      { op: "create", id: target.id, type: "scrollController", props: {} },
      { op: "create", id: node.id, type: "pageController", props: { initialPage: 2, onPage: true } },
      { op: "setProp", id: node.id, name: "linked", value: { _node: target.id } },
    ]);
  });

  test("non-finite numbers cross as strings, at any depth; other values are untouched", () => {
    const el = R.createElement("view", { width: Infinity });
    const box = { maxWidth: Infinity, minWidth: 0, nested: [1, -Infinity, { ratio: NaN }] };
    const plain = { color: "#fff", radius: 4 };
    R.setProp(el, "constraints", box);
    R.setProp(el, "decoration", plain);
    expect(takeOps()).toEqual([
      {
        op: "create",
        id: el.id,
        type: "view",
        props: {
          width: "Infinity",
          constraints: { maxWidth: "Infinity", minWidth: 0, nested: [1, "-Infinity", { ratio: "NaN" }] },
          decoration: { color: "#fff", radius: 4 },
        },
      },
    ]);
    // The caller's objects are not modified.
    expect(box.maxWidth).toBe(Infinity);
    R.setProp(el, "height", Infinity);
    expect(takeOps()).toEqual([{ op: "setProp", id: el.id, name: "height", value: "Infinity" }]);
  });

  test("a handle passed as a prop is sent as a reference to its node", () => {
    const el = R.createElement("scrollView");
    const handle = { node: R.createNode("scrollController", { initialScrollOffset: 10 }) };
    R.setProp(el, "controller", handle);
    expect(takeOps()).toEqual([
      { op: "create", id: el.id, type: "scrollView", props: {} },
      { op: "create", id: handle.node.id, type: "scrollController", props: { initialScrollOffset: 10 } },
      { op: "setProp", id: el.id, name: "controller", value: { _node: handle.node.id } },
    ]);
  });
});

describe("journal", () => {
  test("text nodes, text updates and handle disposal", () => {
    const [label, setLabel] = createSignal("a");
    let el!: InstanceType<typeof R.FuseNode>;
    mount(() => {
      el = R.createElement("text");
      R.insert(el, label);
      return el;
    });
    const text = el.first!;
    expect(takeOps()).toEqual([
      { op: "create", id: el.id, type: "text", props: {} },
      { op: "text", id: text.id, text: "a" },
      { op: "insert", parentId: el.id, childId: text.id, before: null },
      { op: "insert", parentId: 0, childId: el.id, before: null },
    ]);
    setLabel("b");
    flush();
    expect(takeOps()).toEqual([{ op: "setText", id: text.id, text: "b" }]);

    const handle = R.createNode("focusNode");
    R.disposeNode(handle);
    expect(takeOps()).toEqual([
      { op: "create", id: handle.id, type: "focusNode", props: {} },
      { op: "dispose", id: handle.id },
    ]);
  });

  test("nothing is sent when nothing changed", () => {
    R.flushOps();
    expect(sent).toEqual([]);
  });
});

describe("node lifetime", () => {
  /** Collect garbage until `done` holds (finalisers run some time after). */
  async function collect(done: () => boolean) {
    for (let i = 0; i < 50 && !done(); i++) {
      Bun.gc(true);
      await new Promise((r) => setTimeout(r, 2));
    }
  }

  test("a removed node can be inserted again in a later batch", () => {
    // What `<Show when={show()}>{child}</Show>` does with an element held in
    // a variable.
    const parent = R.createElement("view");
    const child = R.createElement("text");
    const [show, setShow] = createSignal(true);
    mount(() => {
      R.insert(parent, () => (show() ? child : undefined));
      return parent;
    });
    takeOps();
    setShow(false);
    flush();
    expect(takeOps()).toEqual([{ op: "remove", childId: child.id }]);
    R.setProp(child, "color", "red");
    setShow(true);
    flush();
    expect(takeOps()).toEqual([
      { op: "setProp", id: child.id, name: "color", value: "red" },
      { op: "insert", parentId: parent.id, childId: child.id, before: null },
    ]);
  });

  test("a detached subtree is disposed once JS lets go of it, by its root alone", async () => {
    const parent = R.createElement("view");
    const [show, setShow] = createSignal(true);
    let rootId = -1, leafId = -1;
    mount(() => {
      let row: InstanceType<typeof R.FuseNode> | undefined = R.createElement("view");
      const leaf = R.createElement("text", { onTap: () => {} });
      R.insertNode(row, leaf);
      rootId = row.id;
      leafId = leaf.id;
      R.insert(parent, () => (show() ? row : (row = undefined)));
      return parent;
    });
    takeOps();
    setShow(false);
    flush();
    const seen: Op[] = [];
    await collect(() => (seen.push(...takeOps()), seen.some((o) => o.op === "dispose" && o.id === rootId)));
    expect(seen).toContainEqual({ op: "dispose", id: rootId });
    // Ops for the subtree itself: nothing but its removal and disposal.
    expect(seen.filter((o) => o.childId === rootId || o.childId === leafId).map((o) => o.op)).toEqual(["remove"]);
  });

  test("a node referenced by a prop lives as long as its owner", async () => {
    const owner = R.createElement("view");
    let iconId = -1;
    (() => {
      const icon = R.createElement("icon");
      iconId = icon.id;
      R.setProp(owner, "leading", icon);
    })();
    const seen: Op[] = [];
    const gone = () => (seen.push(...takeOps()), seen.some((o) => o.op === "dispose" && o.id === iconId));
    Bun.gc(true);
    await new Promise((r) => setTimeout(r, 10));
    Bun.gc(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(gone()).toBe(false);
    // Replaced: nothing else holds the old node, so it goes.
    R.setProp(owner, "leading", R.createElement("icon"));
    await collect(gone);
    expect(gone()).toBe(true);
  });
});

describe("templates (what cli/compile-plugin.ts emits calls to)", () => {
  // <view a={1}><text>hi</text><text b={x()} onTap={f}>{y()}</text></view>
  const shape = ["view", { a: 1 }, ["text", 0, "hi"], ["text", 0]] as any;

  test("the shape is sent with the first instance only; ids are consecutive", () => {
    const t = R.template(shape, 4);
    const first = R.instantiate(t);
    const second = R.instantiate(t);
    expect(second).toBe(first + 4);
    expect(R.createElement("view").id).toBe(second + 4);
    const ops = takeOps();
    expect(ops.slice(0, 3)).toEqual([
      { op: "define", template: t.id, shape },
      { op: "instantiate", template: t.id, id: first, component: null },
      { op: "instantiate", template: t.id, id: second, component: null },
    ]);
    R.instantiate(t);
    expect(takeOps().map((o) => o.op)).toEqual(["instantiate"]);
  });

  test("a hole is the JS node of a template node: props in one op, first insert only links", () => {
    const t = R.template(shape, 4);
    const base = R.instantiate(t);
    const root = R.createElement("h$view", { $t: base, $i: 0 });
    const text = R.createElement("h$text", { $t: base, $i: 3, onTap: () => {} });
    R.setProp(text, "b", 2);
    R.insertNode(root, text);
    expect([root.id, text.id]).toEqual([base, base + 3]);
    expect([root.type, text.type]).toEqual(["view", "text"]);
    expect(text.parent).toBe(root);
    const dynamic = R.createTextNode("y");
    R.insertNode(text, dynamic);
    const parent = R.createElement("view");
    R.insertNode(parent, root);
    expect(takeOps().slice(1)).toEqual([
      { op: "instantiate", template: t.id, id: base, component: null },
      { op: "props", id: text.id, props: { onTap: true, b: 2 } },
      { op: "text", id: dynamic.id, text: "y" },
      { op: "insert", parentId: text.id, childId: dynamic.id, before: null },
      { op: "create", id: parent.id, type: "view", props: {} },
      { op: "insert", parentId: parent.id, childId: root.id, before: null },
    ]);
    // Later changes are ordinary ops; a second insert is a move.
    R.setProp(text, "b", 3);
    R.insertNode(parent, text);
    expect(takeOps()).toEqual([
      { op: "setProp", id: text.id, name: "b", value: 3 },
      { op: "insert", parentId: parent.id, childId: text.id, before: null },
    ]);
  });

  test("a template defined in a dropped batch is defined again", () => {
    const t = R.template(shape, 4);
    R.instantiate(t);
    const cyclic: any = {};
    cyclic.self = cyclic;
    R.setProp(R.createElement("view"), "bad", cyclic);
    R.flushOps();
    sent.length = 0;
    R.instantiate(t);
    expect(takeOps().map((o) => o.op)).toEqual(["define", "instantiate"]);
  });
});

describe("compiler contract", () => {
  // Compiled JSX imports these from "solid-fuse" (the compiler's moduleName):
  // the universal runtime helpers, and the control-flow built-ins a module
  // uses without importing them itself (`Portal` is DOM-only).
  test("the package entry exports every helper the compiler can emit", async () => {
    // Scanned, not imported: the entry pulls in .tsx files that need the
    // Solid compiler.
    const source = await Bun.file(new URL("./index.ts", import.meta.url)).text();
    const exported = new Bun.Transpiler({ loader: "ts" }).scan(source).exports;
    const helpers = [
      "createElement", "createTextNode", "insertNode", "insert", "spread", "setProp",
      "mergeProps", "effect", "memo", "createComponent", "ref", "applyRef",
      "For", "Show", "Switch", "Match", "Loading", "Errored", "Repeat", "Reveal", "Dynamic",
    ];
    expect(helpers.filter((name) => !exported.includes(name))).toEqual([]);
    // ...and the renderer module actually provides the ones it owns.
    const renderer: Record<string, unknown> = R;
    const own = helpers.filter((name) => name !== "Dynamic");
    expect(own.filter((name) => typeof renderer[name] !== "function")).toEqual([]);
  });

  test("ref on an intrinsic element and applyRef hand over the node", () => {
    const el = R.createElement("view");
    let viaRef: unknown, viaApply: unknown;
    mount(() => {
      R.ref(() => (n: unknown) => (viaRef = n), el);
      return el;
    });
    R.applyRef((n: unknown) => (viaApply = n), el);
    expect(viaRef).toBe(el);
    expect(viaApply).toBe(el);
  });
});

describe("spread (what a wrapper component compiles to)", () => {
  // `<view {...props} />` → createElement("view") + spread(el, props, false)
  function wrapper(type: string, props: any) {
    const el = R.createElement(type);
    R.spread(el, props, false);
    return el;
  }
  const setProps = (ops: Op[]) => ops.filter((o) => o.op === "setProp");

  test("literal props of a plain props object ride in create, with no effect", () => {
    let tapped = 0;
    let el!: InstanceType<typeof R.FuseNode>;
    mount(() => (el = wrapper("view", { width: 40, flex: { gap: 2 }, onTap: () => tapped++ })));
    expect(takeOps()[0]).toEqual({
      op: "create", id: el.id, type: "view", props: { width: 40, flex: { gap: 2 }, onTap: true },
    });
  });

  test("getter props update; literals next to them are left alone", () => {
    const [h, setH] = createSignal(1);
    let el!: InstanceType<typeof R.FuseNode>;
    mount(() => (el = wrapper("view", { width: 40, get height() { return h(); } })));
    expect(takeOps()[0].props).toEqual({ width: 40, height: 1 });
    setH(2);
    flush();
    expect(takeOps()).toEqual([{ op: "setProp", id: el.id, name: "height", value: 2 }]);
    setH(2);
    flush();
    expect(takeOps()).toEqual([]);
  });

  test("children: static and getter; skipChildren leaves them out", () => {
    const [label, setLabel] = createSignal("a");
    let outer!: InstanceType<typeof R.FuseNode>;
    let inner!: InstanceType<typeof R.FuseNode>;
    mount(() => {
      inner = wrapper("text", { get children() { return label(); } });
      outer = wrapper("view", { children: inner });
      return outer;
    });
    expect(outer.children).toEqual([inner]);
    const text = inner.first!;
    takeOps();
    setLabel("b");
    flush();
    expect(takeOps()).toEqual([{ op: "setText", id: text.id, text: "b" }]);

    const skipped = R.createElement("view");
    R.spread(skipped, { width: 1, children: R.createElement("text") }, true);
    expect(skipped.first).toBeUndefined();
  });

  test("ref, as a literal and as a getter, receives the node", () => {
    const seen: unknown[] = [];
    let a!: InstanceType<typeof R.FuseNode>;
    let b!: InstanceType<typeof R.FuseNode>;
    mount(() => {
      a = wrapper("view", { ref: (n: unknown) => seen.push(n) });
      b = wrapper("view", { get ref() { return (n: unknown) => seen.push(n); } });
      return [a, b];
    });
    expect(seen).toEqual([a, b]);
    expect(takeOps().filter((o) => o.op === "create").map((o) => o.props)).toEqual([{}, {}]);
  });

  test("a store keeps the reactive path: keys can change", () => {
    const [state, setState] = createStore<Record<string, any>>({ width: 1 });
    let el!: InstanceType<typeof R.FuseNode>;
    mount(() => (el = wrapper("view", state)));
    expect(takeOps()[0].props).toEqual({ width: 1 });
    setState((s) => {
      s.width = 2;
      s.height = 3;
    });
    flush();
    expect(setProps(takeOps())).toEqual([
      { op: "setProp", id: el.id, name: "width", value: 2 },
      { op: "setProp", id: el.id, name: "height", value: 3 },
    ]);
  });

  test("merged props and an array of sources keep the reactive path", () => {
    const [w, setW] = createSignal(1);
    let a!: InstanceType<typeof R.FuseNode>;
    let b!: InstanceType<typeof R.FuseNode>;
    mount(() => {
      a = wrapper("view", R.mergeProps({ height: 5 }, { get width() { return w(); } }));
      // `<view {...p} width={w()} />`
      b = R.createElement("view");
      R.spread(b, [{ height: 6, width: 0 }, { get width() { return w(); } }], false);
      return [a, b];
    });
    const created = takeOps().filter((o) => o.op === "create");
    expect(created.map((o) => o.props)).toEqual([{ height: 5, width: 1 }, { height: 6, width: 1 }]);
    setW(9);
    flush();
    expect(setProps(takeOps())).toEqual([
      { op: "setProp", id: a.id, name: "width", value: 9 },
      { op: "setProp", id: b.id, name: "width", value: 9 },
    ]);
  });
});

describe("flush", () => {
  test("a batch that cannot be serialised is dropped, later batches still go out", () => {
    const el = R.createElement("view");
    const cyclic: any = {};
    cyclic.self = cyclic;
    R.setProp(el, "bad", cyclic);
    // Reported (console.error without a dev server), not thrown.
    const error = console.error;
    const reported: unknown[] = [];
    console.error = (err: unknown) => void reported.push(err);
    try {
      R.flushOps();
    } finally {
      console.error = error;
    }
    expect(reported.length).toBe(1);
    expect(sent.filter((m) => m.channel === "_ops")).toEqual([]);
    sent.length = 0;
    R.setProp(el, "width", 1);
    expect(takeOps()).toEqual([{ op: "setProp", id: el.id, name: "width", value: 1 }]);
  });
});

describe("generated handles ($handle)", () => {
  let G: typeof import("./generated");
  beforeAll(async () => {
    G = await import("./generated");
  });
  const spec = { s: ["text", "count"], w: ["text"], o: ["text"], m: ["clear"], st: [] };
  const dispatch = (name: string, data: any) => (globalThis as any).__dispatch(name, data);
  const calls = () => sent.filter((m) => m.channel === "_handleCall");

  async function collect(done: () => boolean) {
    for (let i = 0; i < 50 && !done(); i++) {
      Bun.gc(true);
      await new Promise((r) => setTimeout(r, 2));
    }
  }

  test("options ride in create; accessors are read once; state is seeded", () => {
    let h: any;
    const dispose = createRoot((d) => {
      h = G.$handle("t_Ctl", spec, { text: () => "hi", onDone: () => {} }, { ctor: "named", fns: ["onDone"], seeds: { count: 0 } });
      return d;
    });
    const [create] = takeOps();
    expect(create).toEqual({ op: "create", id: h.node.id, type: "t_Ctl", props: { text: "hi", onDone: true, $ctor: "named" } });
    expect(h.text()).toBe("hi");
    expect(h.count()).toBe(0);
    dispose();
  });

  test("pushes update state; a push older than JS's last write is dropped", async () => {
    let h: any;
    const dispose = createRoot((d) => {
      h = G.$handle("t_Ctl", spec, { text: "a" }, {});
      return d;
    });
    takeOps();
    await dispatch("_functionCall", { nodeId: h.node.id, name: "$push", value: { v: 0, s: { text: "ab", count: 2 } } });
    flush();
    expect([h.text(), h.count()]).toEqual(["ab", 2]);
    sent.length = 0;
    h.setText("x");
    flush();
    expect(h.text()).toBe("x");
    expect(calls()).toEqual([{ channel: "_handleCall", node: h.node.id, method: "$set", value: { n: "text", v: "x", ver: 1 } }]);
    // Typed in Dart before the write landed: stale.
    await dispatch("_functionCall", { nodeId: h.node.id, name: "$push", value: { v: 0, s: { text: "abc" } } });
    flush();
    expect(h.text()).toBe("x");
    await dispatch("_functionCall", { nodeId: h.node.id, name: "$push", value: { v: 1, s: { text: "xy" } } });
    flush();
    expect(h.text()).toBe("xy");
    dispose();
  });

  test("methods send their arguments; a live accessor writes through the setter", () => {
    const [text, setText] = createSignal("a");
    let h: any;
    const dispose = createRoot((d) => {
      h = G.$handle("t_Ctl", spec, { text }, { live: ["text"] });
      return d;
    });
    flush();
    takeOps();
    sent.length = 0;
    h.clear(1, { all: true });
    expect(calls()).toEqual([{ channel: "_handleCall", node: h.node.id, method: "clear", value: [1, { all: true }] }]);
    sent.length = 0;
    setText("b");
    flush();
    expect(calls()).toEqual([{ channel: "_handleCall", node: h.node.id, method: "$set", value: { n: "text", v: "b", ver: 1 } }]);
    dispose();
  });

  test("lives while its owner does and while JS holds it, whichever is longer", async () => {
    let held: any;
    let id = -1;
    const disposeA = createRoot((d) => {
      held = G.$handle("t_Ctl", spec, undefined, {});
      id = held.node.id;
      return d;
    });
    const seen: Op[] = [];
    const gone = () => (seen.push(...takeOps()), seen.some((o) => o.op === "dispose" && o.id === id));
    disposeA();
    await collect(gone);
    expect(gone()).toBe(false); // owner gone, still held
    held = undefined;
    await collect(gone);
    expect(gone()).toBe(true);

    // Dropped while the owner lives: kept until the owner goes.
    let id2 = -1;
    const disposeB = createRoot((d) => {
      id2 = (G.$handle("t_Ctl", spec, undefined, {}) as any).node.id;
      return d;
    });
    const seen2: Op[] = [];
    const gone2 = () => (seen2.push(...takeOps()), seen2.some((o) => o.op === "dispose" && o.id === id2));
    await collect(gone2);
    expect(gone2()).toBe(false);
    disposeB();
    expect(gone2()).toBe(true);
  });

  describe("handles Dart hands to JS", () => {
    const tracker = { s: ["hits"], w: [], o: [], m: ["hit"], st: [] };
    beforeAll(() => G.$handleType("t_Tracker", tracker));
    const unborrows = () => sent.filter((m) => m.channel === "_unborrow").map(({ channel, ...m }) => m);

    test("a reference becomes a handle with its type's members and state; the same id gives the same handle", async () => {
      const got: any[] = [];
      const el = R.createElement("view", { onT: (t: any) => got.push(t) });
      takeOps();
      sent.length = 0;
      await dispatch("_functionCall", { nodeId: el.id, name: "onT", value: { $h: -5, t: "t_Tracker", s: { hits: 3 } } });
      await dispatch("_functionCall", { nodeId: el.id, name: "onT", value: { $h: -5, t: "t_Tracker" } });
      expect(got[0]).toBe(got[1]);
      expect(got[0].node.id).toBe(-5);
      expect(got[0].hits()).toBe(3);
      void got[0].hit();
      expect(calls()).toEqual([{ channel: "_handleCall", node: -5, method: "hit", value: [] }]);
      // No ops: Dart has the node already.
      expect(takeOps()).toEqual([]);
      await dispatch("_functionCall", { nodeId: -5, name: "$push", value: { v: 0, s: { hits: 4 } } });
      flush();
      expect(got[0].hits()).toBe(4);
    });

    test("without state, it asks for it; passed back, it is a node reference", async () => {
      let got: any;
      const el = R.createElement("view", { onT: (t: any) => (got = t) });
      takeOps();
      sent.length = 0;
      await dispatch("_functionCall", { nodeId: el.id, name: "onT", value: [{ $h: -6, t: "t_Tracker" }] });
      expect(got[0].hits()).toBe(undefined);
      expect(calls()).toEqual([{ channel: "_handleCall", node: -6, method: "$sync", value: null }]);
      R.setProp(el, "tracker", got[0]);
      expect(takeOps()).toEqual([{ op: "setProp", id: el.id, name: "tracker", value: { _node: -6 } }]);
      R.setProp(el, "tracker", null);
      takeOps();
    });

    test("once JS lets go, it gives back every reference Dart counted", async () => {
      const el = R.createElement("view", { onT: () => {} });
      takeOps();
      sent.length = 0;
      await dispatch("_functionCall", { nodeId: el.id, name: "onT", value: { $h: -7, t: "t_Tracker", s: {} } });
      await dispatch("_functionCall", { nodeId: el.id, name: "onT", value: { $h: -7, t: "t_Tracker" } });
      // Even a call nothing handles counts.
      await dispatch("_functionCall", { nodeId: el.id, name: "nothing", value: { $h: -7, t: "t_Tracker" } });
      const mine = () => unborrows().filter((m) => m.id === -7);
      await collect(() => mine().length > 0);
      expect(mine()).toEqual([{ id: -7, n: 3 }]);
    });

    test("one JS created comes back as itself, uncounted", async () => {
      let h: any;
      let got: any;
      const dispose = createRoot((d) => {
        h = G.$handle("t_Ctl", spec, undefined, {});
        return d;
      });
      const el = R.createElement("view", { onT: (t: any) => (got = t) });
      takeOps();
      await dispatch("_functionCall", { nodeId: el.id, name: "onT", value: { $h: h.node.id, t: "t_Ctl", o: 1 } });
      expect(got).toBe(h);
      dispose();
    });
  });
});

describe("synchronous calls (builders)", () => {
  const sync = (data: any) => (globalThis as any).__dispatchSync("_callSync", data);
  const opsOf = (reply: any): Op[] => reply.ops.batches.flatMap(([, json]: [number, string]) => decode(JSON.parse(json)));

  /** Flush, and let Dart answer the `_ops` messages. */
  const applied = async () => {
    takeOps();
    await Promise.resolve();
  };

  test("a widget call returns the node it built, with the ops that create it", async () => {
    const el = R.createElement("view", { itemBuilder: (i: number) => R.createElement("text", { label: `item ${i}` }) });
    await applied();
    const reply = sync({ nodeId: el.id, name: "itemBuilder", value: 3, widget: true });
    const id = reply.result.value._node;
    expect(reply.result.root).toBeNumber();
    expect(reply.ops.v).toBe(4);
    expect(opsOf(reply)).toEqual([{ op: "create", id, type: "text", props: { label: "item 3" } }]);
    // Nothing left for the ordinary flush.
    expect(takeOps()).toEqual([]);
  });

  test("batches Dart may not have applied yet come along, oldest first", () => {
    const bridge = (globalThis as any).fjs.bridge_call;
    // Dart is busy: no `_ops` message is answered.
    (globalThis as any).fjs.bridge_call = (msg: any) => (sent.push(msg), new Promise(() => {}));
    try {
      const el = R.createElement("view", { build: () => R.createElement("text") });
      R.flushOps();
      const b = sent.find((m) => m.channel === "_ops").b;
      const reply = sync({ nodeId: el.id, name: "build", widget: true });
      expect(reply.ops.batches.map(([n]: [number]) => n)).toEqual([b, b + 1]);
      expect(opsOf(reply)[0]).toEqual({ op: "create", id: el.id, type: "view", props: { build: true } });
      // Handed over: the next call doesn't repeat them.
      const again = sync({ nodeId: el.id, name: "build", widget: true });
      expect(again.ops.batches.map(([n]: [number]) => n)).toEqual([b + 2]);
    } finally {
      (globalThis as any).fjs.bridge_call = bridge;
      sent.length = 0;
    }
  });

  test("text, a list or nothing: a slot node, or null", async () => {
    let out: any = "hello";
    const el = R.createElement("view", { build: () => out });
    await applied();
    const reply = sync({ nodeId: el.id, name: "build", widget: true });
    const ops = opsOf(reply);
    expect(ops[0]).toEqual({ op: "create", id: reply.result.value._node, type: "__slot__", props: {} });
    expect(ops.slice(1).map((o) => o.op)).toEqual(["text", "insert"]);
    out = undefined;
    expect(sync({ nodeId: el.id, name: "build", widget: true }).result).toEqual({ value: null });
  });

  test("the root lives until Dart unbuilds it, and runs under the builder's owner", async () => {
    let cleaned = 0;
    const [n, setN] = createSignal(1);
    let el!: InstanceType<typeof R.FuseNode>;
    let disposeOwner!: () => void;
    createRoot((d) => {
      disposeOwner = d;
      el = R.createElement("view", {
        build: () => {
          const t = R.createElement("text");
          R.effect(n, (v: number, p?: number) => void R.setProp(t, "n", v, p));
          (onCleanupFn as any)(() => cleaned++);
          return t;
        },
      });
    });
    takeOps();
    const reply = sync({ nodeId: el.id, name: "build", widget: true });
    const id = reply.result.value._node;
    setN(2);
    expect(takeOps()).toContainEqual({ op: "setProp", id, name: "n", value: 2 });
    await (globalThis as any).__dispatch("_unbuild", { root: reply.result.root });
    expect(cleaned).toBe(1);
    setN(3);
    expect(takeOps()).toEqual([]);
    // A root the owner took down first is unbuilt without trouble.
    const other = sync({ nodeId: el.id, name: "build", widget: true });
    disposeOwner();
    expect(cleaned).toBe(2);
    await (globalThis as any).__dispatch("_unbuild", { root: other.result.root });
    expect(cleaned).toBe(2);
  });

  test("a value call returns the encoded value; a throw is an error", () => {
    const el = R.createElement("view", {
      size: (a: number, b: number) => ({ w: a * b, h: Infinity }),
      bad: () => {
        throw new Error("no");
      },
    });
    takeOps();
    expect(sync({ nodeId: el.id, name: "size", args: [2, 3] }).result).toEqual({ value: { w: 6, h: "Infinity" } });
    expect(sync({ nodeId: el.id, name: "bad" }).result).toEqual({ error: "no" });
    expect(sync({ nodeId: el.id, name: "bad", widget: true }).result).toEqual({ error: "no" });
  });
});
