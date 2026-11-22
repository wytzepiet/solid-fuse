import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createSignal, createStore, flush, For } from "solid-js";

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
    expect(m.v).toBe(2);
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
