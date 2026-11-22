import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createSignal, flush, For } from "solid-js";

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

type Op = Record<string, any>;

/** Flush and return every op sent since the last call. */
function takeOps(): Op[] {
  R.flushOps();
  const out: Op[] = [];
  for (const m of sent) if (m.channel === "_ops") out.push(...JSON.parse(m.json));
  sent.length = 0;
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
      if (op.op === "create") this.children.set(op.id, []);
      else if (op.op === "insert") {
        this.detach(op.childId);
        this.children.get(op.parentId)!.splice(op.index, 0, op.childId);
        this.parent.set(op.childId, op.parentId);
      } else if (op.op === "remove") {
        if (this.parent.get(op.childId) === op.parentId) this.detach(op.childId);
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
      { op: "insert", parentId: parent.id, childId: c.id, index: 0 },
      { op: "insert", parentId: parent.id, childId: c.id, index: 2 },
    ]);
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
    R.render(() => {
      R.insert(p2, () => (show() ? n : undefined));
      return p2;
    });
    expect(n.parent).toBe(p2);
    takeOps();
    setShow(false);
    flush();
    expect(p2.children).toEqual([]);
    expect(n.parent).toBeUndefined();
    expect(takeOps()).toEqual([{ op: "remove", parentId: p2.id, childId: n.id }]);
  });
});

describe("keyed list moves", () => {
  function mountList(n: number) {
    const [rows, setRows] = createSignal(Array.from({ length: n }, (_, i) => ({ key: i })));
    const byKey = new Map<number, number>(); // row key → node id
    let list!: InstanceType<typeof R.FuseNode>;
    const tree = new DartTree();
    R.render(() => {
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
