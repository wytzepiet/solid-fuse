// Ablation of the JS cost of mounting the standard card, and micro benchmarks
// (ported from the report 11 `abl.tsx`; the template variants are not on main).
// Every variant builds the same 11-node card `cards` times (3 views, 4 text
// elements, 4 text leaves; 41 ops per card) under a detached parent, so the
// only thing that changes between variants is how the ops get produced.
import {
  View, Text, For, createElement, createTextNode, insertNode, insert, spread, setProp, createComponent, effect,
  mergeProps, flushOps, type FuseNode,
} from "solid-fuse";
import { createRoot, createSignal, createMemo, merge, omit, untrack, createRenderEffect, createTrackedEffect, createEffect, createOwner, onCleanup } from "solid-js";
import { now, stats, resetStats } from "./harness";
import { Card } from "./screens";

declare const fjs: { bridge_call: (v: any) => Promise<any> };

const COLORS = ["#3366ff", "#2e9e5b", "#e08a00", "#d64545", "#7a4fd6", "#0aa5a5", "#c2478f", "#5b6b7a"];

// ---- A. Solid, intrinsic elements with the same props as Card (compiler output) ----
function CardI(p: { i: number }) {
  return (
    <view
      padding={{ horizontal: 16, vertical: 10 }}
      margin={{ bottom: 8 }}
      decoration={{ color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } }}
      flex={{ direction: "horizontal", gap: 12, align: "center" }}
    >
      <view width={40} height={40} alignment="center" decoration={{ color: COLORS[p.i % 8], shape: "circle" }}>
        <text color="white" fontWeight="bold">{String.fromCharCode(65 + (p.i % 26))}</text>
      </view>
      <view flex={{ gap: 2 }}>
        <text fontSize={16} fontWeight="semiBold">{`Item title ${p.i}`}</text>
        <text fontSize={13} color="#666666" maxLines={1} overflow="ellipsis">{`Subtitle for row ${p.i}, with some detail`}</text>
      </view>
      <text fontSize={12} color="#999999">{`${p.i % 60}m`}</text>
    </view>
  );
}

// ---- A2. CardI as @solidjs/compiler 2.0.2 compiles it, written out by hand, with the
// static props applied. The compiler passes static props as the second argument
// of createElement, which main's renderer ignores (they never reach Dart), so
// `card_intrinsic` does less work than a correct renderer would; this variant
// applies them with setProp, the cheapest correct reading.
function el(tag: string, props?: Record<string, any>) {
  const e = createElement(tag);
  if (props) for (const k in props) setProp(e, k, props[k]);
  return e;
}
function CardCompiled(p: { i: number }) {
  const e1 = el("view", {
    padding: { horizontal: 16, vertical: 10 }, margin: { bottom: 8 },
    decoration: { color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } },
    flex: { direction: "horizontal", gap: 12, align: "center" },
  });
  const e2 = el("view", { width: 40, height: 40, alignment: "center" });
  const e3 = el("text", { color: "white", fontWeight: "bold" });
  const e4 = el("view", { flex: { gap: 2 } });
  const e5 = el("text", { fontSize: 16, fontWeight: "semiBold" });
  const e6 = el("text", { fontSize: 13, color: "#666666", maxLines: 1, overflow: "ellipsis" });
  const e7 = el("text", { fontSize: 12, color: "#999999" });
  insertNode(e1, e2); insertNode(e1, e4); insertNode(e1, e7); insertNode(e2, e3);
  insert(e3, () => String.fromCharCode(65 + (p.i % 26)));
  insertNode(e4, e5); insertNode(e4, e6);
  insert(e5, () => `Item title ${p.i}`);
  insert(e6, () => `Subtitle for row ${p.i}, with some detail`);
  insert(e7, () => `${p.i % 60}m`);
  effect(() => ({ color: COLORS[p.i % 8], shape: "circle" }), (v: any, prev: any) => { (setProp as any)(e2, "decoration", v, prev); });
  return e1;
}

// ---- B. the same, every prop and text a constant ----
const P1 = { horizontal: 16, vertical: 10 }, M1 = { bottom: 8 };
const D1 = { color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } };
const F1 = { direction: "horizontal", gap: 12, align: "center" }, D2 = { color: "#3366ff", shape: "circle" }, F2 = { gap: 2 };
function CardS() {
  return (
    <view padding={P1} margin={M1} decoration={D1} flex={F1}>
      <view width={40} height={40} alignment="center" decoration={D2}>
        <text color="white" fontWeight="bold">A</text>
      </view>
      <view flex={F2}>
        <text fontSize={16} fontWeight="semiBold">Item title 12</text>
        <text fontSize={13} color="#666666" maxLines={1} overflow="ellipsis">Subtitle for row 12, with some detail</text>
      </view>
      <text fontSize={12} color="#999999">12m</text>
    </view>
  );
}

// ---- C. what the View/Text wrappers do, without createComponent ----
function h(tag: string, props: any) {
  const el = createElement(tag);
  spread(el, props, false);
  return el;
}
function cardSpread(i: number) {
  return h("view", {
    padding: { horizontal: 16, vertical: 10 }, margin: { bottom: 8 },
    decoration: { color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } },
    flex: { direction: "horizontal", gap: 12, align: "center" },
    get children() {
      return [
        h("view", {
          width: 40, height: 40, alignment: "center",
          get decoration() { return { color: COLORS[i % 8], shape: "circle" }; },
          get children() {
            return h("text", { color: "white", fontWeight: "bold", get children() { return String.fromCharCode(65 + (i % 26)); } });
          },
        }),
        h("view", {
          flex: { gap: 2 },
          get children() {
            return [
              h("text", { fontSize: 16, fontWeight: "semiBold", get children() { return `Item title ${i}`; } }),
              h("text", {
                fontSize: 13, color: "#666666", maxLines: 1, overflow: "ellipsis",
                get children() { return `Subtitle for row ${i}, with some detail`; },
              }),
            ];
          },
        }),
        h("text", { fontSize: 12, color: "#999999", get children() { return `${i % 60}m`; } }),
      ];
    },
  });
}

// ---- D. no Solid at all: the renderer's own entry points, same ops ----
function rawText(parent: FuseNode, a: [string, any][], s: string) {
  const t = createElement("text");
  for (let k = 0; k < a.length; k++) setProp(t, a[k][0], a[k][1]);
  insertNode(t, createTextNode(s));
  insertNode(parent, t);
}
function cardRaw(parent: FuseNode, i: number) {
  const c = createElement("view");
  setProp(c, "padding", { horizontal: 16, vertical: 10 });
  setProp(c, "margin", { bottom: 8 });
  setProp(c, "decoration", { color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } });
  setProp(c, "flex", { direction: "horizontal", gap: 12, align: "center" });
  const a = createElement("view");
  setProp(a, "width", 40); setProp(a, "height", 40); setProp(a, "alignment", "center");
  setProp(a, "decoration", { color: COLORS[i % 8], shape: "circle" });
  rawText(a, [["color", "white"], ["fontWeight", "bold"]], String.fromCharCode(65 + (i % 26)));
  insertNode(c, a);
  const b = createElement("view");
  setProp(b, "flex", { gap: 2 });
  rawText(b, [["fontSize", 16], ["fontWeight", "semiBold"]], `Item title ${i}`);
  rawText(b, [["fontSize", 13], ["color", "#666666"], ["maxLines", 1], ["overflow", "ellipsis"]], `Subtitle for row ${i}, with some detail`);
  insertNode(c, b);
  rawText(c, [["fontSize", 12], ["color", "#999999"]], `${i % 60}m`);
  insertNode(parent, c);
}

// ---- E. a replica of the renderer's emit path with switches --------------------
// (verified against D: `rep_full` must cost what `raw` costs)
class NodeFields { // class fields: compiled to _defineProperty calls at target es2020, as in dist
  id = RID++;
  props: Record<string, any> = {};
  children: any[] = [];
  parent: any = undefined;
  component: string | undefined = undefined;
  constructor(public type: string) {}
}
function NodePlain(this: any, type: string) {
  this.type = type; this.id = RID++; this.props = {}; this.children = []; this.parent = undefined; this.component = undefined;
}
let RID = 1_000_000;
let out: any[] = [];
// Nothing but the 41 op objects of a card.
function cardObjOnly(i: number) {
  let id = RID; RID += 11;
  const o = out;
  const el = (tag: string) => { o.push({ op: "create", id: id, type: tag, props: {} }); return id++; };
  const pr = (n: number, name: string, value: any) => { o.push({ op: "setProp", id: n, name, value }); };
  const ins = (p: number, c: number, index: number) => { o.push({ op: "insert", parentId: p, childId: c, index }); };
  const tx = (p: number, a: [string, any][], s: string, index: number) => {
    const t = el("text");
    for (let k = 0; k < a.length; k++) pr(t, a[k][0], a[k][1]);
    o.push({ op: "create", id: id, type: "__text__", props: { text: s } });
    ins(t, id++, 0); ins(p, t, index);
  };
  const c = el("view");
  pr(c, "padding", { horizontal: 16, vertical: 10 }); pr(c, "margin", { bottom: 8 });
  pr(c, "decoration", { color: "#ffffff", borderRadius: 12, border: { width: 1, color: "#e2e2e2" } });
  pr(c, "flex", { direction: "horizontal", gap: 12, align: "center" });
  const a = el("view");
  pr(a, "width", 40); pr(a, "height", 40); pr(a, "alignment", "center"); pr(a, "decoration", { color: COLORS[i % 8], shape: "circle" });
  tx(a, [["color", "white"], ["fontWeight", "bold"]], String.fromCharCode(65 + (i % 26)), 0);
  ins(c, a, 0);
  const b = el("view");
  pr(b, "flex", { gap: 2 });
  tx(b, [["fontSize", 16], ["fontWeight", "semiBold"]], `Item title ${i}`, 0);
  tx(b, [["fontSize", 13], ["color", "#666666"], ["maxLines", 1], ["overflow", "ellipsis"]], `Subtitle for row ${i}, with some detail`, 1);
  ins(c, b, 1);
  tx(c, [["fontSize", 12], ["color", "#999999"]], `${i % 60}m`, 2);
  ins(0, c, i);
}

// ---- variants -----------------------------------------------------------------

type Send = "struct" | "json" | "none";
interface Variant { run: (cards: number, parent: FuseNode) => void; send?: Send; solid?: boolean }
const items = (n: number) => Array.from({ length: n }, (_, i) => i);
const V: Record<string, Variant> = {
  // Solid
  card_for: { solid: true, run: (n, p) => insert(p, <For each={items(n)}>{(i) => <Card i={i} />}</For>) },
  card_map: { solid: true, run: (n, p) => insert(p, items(n).map((i) => <Card i={i} />)) },
  card_nocomp: { solid: true, run: (n, p) => insert(p, items(n).map((i) => cardSpread(i))) },
  card_intrinsic: { solid: true, run: (n, p) => insert(p, items(n).map((i) => <CardI i={i} />)) },
  card_compiled: { solid: true, run: (n, p) => insert(p, items(n).map((i) => createComponent(CardCompiled, { i }))) },
  card_static: { solid: true, run: (n, p) => insert(p, items(n).map(() => <CardS />)) },
  // no Solid: the renderer's own entry points
  raw: { run: (n, p) => { for (let i = 0; i < n; i++) cardRaw(p, i); } },
  // only the op objects, then sent structured (fjs from_js walks every object), as JSON, or not at all
  objonly: { send: "struct", run: (n) => { for (let i = 0; i < n; i++) cardObjOnly(i); } },
  objonly_json: { send: "json", run: (n) => { for (let i = 0; i < n; i++) cardObjOnly(i); } },
  objonly_nosend: { send: "none", run: (n) => { for (let i = 0; i < n; i++) cardObjOnly(i); } },
};

function runVariant(name: string, cards: number) {
  const v = V[name];
  if (!v) throw new Error("no variant " + name);
  out = [];
  let dispose: (() => void) | undefined;
  let sendMs = 0, nOps = 0, bytes = 0, strMs = 0;
  const parent = createElement("view");
  flushOps();
  resetStats();
  const t0 = now();
  if (v.solid) {
    createRoot((d) => { dispose = d; v.run(cards, parent); });
    flushOps();
    sendMs = stats.sendMs; nOps = stats.ops; bytes = stats.bytes;
  } else if (!v.send) {
    v.run(cards, parent);
    flushOps();
    sendMs = stats.sendMs; nOps = stats.ops; bytes = stats.bytes;
  } else {
    v.run(cards, parent);
    const t1 = now();
    nOps = out.length;
    if (v.send === "struct") fjs.bridge_call({ channel: "_abl", ops: out });
    else if (v.send === "json") {
      const s = JSON.stringify(out); strMs = now() - t1; bytes = s.length;
      fjs.bridge_call({ channel: "_abl", s });
    }
    sendMs = now() - t1;
  }
  const jsMs = now() - t0;
  if (dispose) { dispose(); flushOps(); }
  out = [];
  return { jsMs, sendMs, strMs, ops: nOps, bytes };
}

// ---- micro benchmarks: nanoseconds per iteration ---------------------------------

const sinkArr: any[] = [];
const [sig] = createSignal(1);
const Trivial = (p: any) => p.a;
const MICRO: Record<string, (n: number) => void> = {
  loop: (n) => { let x = 0; for (let i = 0; i < n; i++) x += i; sinkArr[0] = x; },
  call: (n) => { const f = (i: number) => i + 1; let x = 0; for (let i = 0; i < n; i++) x = f(x); sinkArr[0] = x; },
  obj4: (n) => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = { op: "setProp", id: i, name: "width", value: 40 }; },
  obj4_push: (n) => { const a: any[] = []; for (let i = 0; i < n; i++) a.push({ op: "setProp", id: i, name: "width", value: 40 }); },
  flat4_push: (n) => { const a: any[] = []; for (let i = 0; i < n; i++) a.push(2, i, "width", 40); },
  closure: (n) => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = () => i; },
  getterObj: (n) => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = { x: 1, get children() { return i; }, get y() { return i; } }; },
  node_fields: (n) => { for (let i = 0; i < n; i++) new NodeFields("view"); },
  node_plain: (n) => { for (let i = 0; i < n; i++) new (NodePlain as any)("view"); },
  createElement: (n) => { for (let i = 0; i < n; i++) createElement("view"); },
  createTextNode: (n) => { for (let i = 0; i < n; i++) createTextNode("abc"); },
  setProp_num: (n) => { const e = createElement("view"); for (let i = 0; i < n; i++) setProp(e, "width", i); },
  setProp_fn: (n) => { const e = createElement("view"); const f = () => {}; for (let i = 0; i < n; i++) setProp(e, "onTap", f); },
  insertNode: (n) => { const p = createElement("view"); const c = new Array(n); for (let i = 0; i < n; i++) c[i] = createElement("view"); flushOps(); const t = now(); for (let i = 0; i < n; i++) insertNode(p, c[i]); microAdj = now() - t; },
  promiseThen: (n) => { const f = () => {}; for (let i = 0; i < n; i++) Promise.resolve().then(f); },
  mapSetKey: (n) => { const m = new Map<string, any>(); for (let i = 0; i < n; i++) m.set(`${i}:onTap`, i); },
  signal: (n) => { for (let i = 0; i < n; i++) createSignal(i); },
  memo: (n) => { for (let i = 0; i < n; i++) createMemo(() => sig()); },
  cre_plain: (n) => { for (let i = 0; i < n; i++) createRenderEffect(() => 1, () => {}); },
  cre_transparent_sync: (n) => { const o = { transparent: true, sync: true }; for (let i = 0; i < n; i++) createRenderEffect(() => 1, () => {}, o as any); },
  cre_sync: (n) => { const o = { sync: true }; for (let i = 0; i < n; i++) createRenderEffect(() => 1, () => {}, o as any); },
  tracked_effect: (n) => { for (let i = 0; i < n; i++) createTrackedEffect(() => {}); },
  user_effect: (n) => { for (let i = 0; i < n; i++) createEffect(() => 1, () => {}); },
  memo_lazy: (n) => { const o = { lazy: true }; for (let i = 0; i < n; i++) createMemo(() => 1, o as any); },
  owner: (n) => { for (let i = 0; i < n; i++) createOwner(); },
  root: (n) => { for (let i = 0; i < n; i++) createRoot(() => 1); },
  cleanup: (n) => { const f = () => {}; for (let i = 0; i < n; i++) onCleanup(f); },
  effect_static: (n) => { for (let i = 0; i < n; i++) effect(() => 1, () => {}); },
  effect_tracking: (n) => { for (let i = 0; i < n; i++) effect(() => sig(), () => {}); },
  createComponent: (n) => { const p = { a: 1 }; for (let i = 0; i < n; i++) createComponent(Trivial, p); },
  untrack: (n) => { const f = () => 1; for (let i = 0; i < n; i++) untrack(f); },
  merge_static2: (n) => { const a = { a: 1, b: 2 }, b = { c: 3 }; for (let i = 0; i < n; i++) merge(a, b); },
  merge_fnsource: (n) => { const a = { a: 1, b: 2 }, b = () => ({ c: 3 }); for (let i = 0; i < n; i++) merge(a, b as any); },
  mergeProps_renderer: (n) => { const a = { a: 1, b: 2 }, b = { c: 3 }; for (let i = 0; i < n; i++) mergeProps(a, b); },
  omit1of4: (n) => { const a = { a: 1, b: 2, c: 3, d: 4 }; for (let i = 0; i < n; i++) omit(a, "a"); },
  read_plain4: (n) => { const a: any = { a: 1, b: 2, c: 3, d: 4 }; let x = 0; for (let i = 0; i < n; i++) x += a.a + a.b + a.c + a.d; sinkArr[0] = x; },
  read_mergedProxy4: (n) => { const a: any = merge({ a: 1, b: 2 }, (() => ({ c: 3, d: 4 })) as any); let x = 0; for (let i = 0; i < n; i++) x += a.a + a.b + a.c + a.d; sinkArr[0] = x; },
  read_omitted4: (n) => { const a: any = omit({ a: 1, b: 2, c: 3, d: 4, e: 5 }, "e"); let x = 0; for (let i = 0; i < n; i++) x += a.a + a.b + a.c + a.d; sinkArr[0] = x; },
  forin4_copy: (n) => { const a: any = { a: 1, b: 2, c: 3, d: 4 }; for (let i = 0; i < n; i++) { const o: any = {}; for (const k in a) o[k] = a[k]; } },
  spread0: (n) => { const p = {}; for (let i = 0; i < n; i++) spread(createElement("view"), p, true); },
  spread4: (n) => { const p = { width: 40, height: 40, alignment: "center", opacity: 1 }; for (let i = 0; i < n; i++) spread(createElement("view"), p, true); },
  spread4_children: (n) => { const p = { width: 40, height: 40, alignment: "center", opacity: 1 }; for (let i = 0; i < n; i++) spread(createElement("view"), p, false); },
  spread4_textchild: (n) => { const p = { width: 40, height: 40, alignment: "center", opacity: 1, children: "abc" }; for (let i = 0; i < n; i++) spread(createElement("view"), p, false); },
  elem4_direct: (n) => { for (let i = 0; i < n; i++) { const e = createElement("view"); setProp(e, "width", 40); setProp(e, "height", 40); setProp(e, "alignment", "center"); setProp(e, "opacity", 1); } },
  insert_static_text: (n) => { for (let i = 0; i < n; i++) insert(createElement("text"), "abc"); },
  insert_dynamic_text: (n) => { for (let i = 0; i < n; i++) insert(createElement("text"), () => "abc"); },
  View4: (n) => { for (let i = 0; i < n; i++) <View width={40} height={40} alignment="center" opacity={1} />; },
  view4_intrinsic: (n) => { for (let i = 0; i < n; i++) <view width={40} height={40} alignment="center" opacity={1} />; },
  view4_intrinsic_dyn: (n) => { for (let i = 0; i < n; i++) <view width={sig() + i} height={40} alignment="center" opacity={1} />; },
  Text_child: (n) => { for (let i = 0; i < n; i++) <Text fontSize={12}>{`x${i}`}</Text>; },
  text_intrinsic_child: (n) => { for (let i = 0; i < n; i++) <text fontSize={12}>{`x${i}`}</text>; },
};
let microAdj = -1;

function runMicro(name: string, n: number) {
  const f = MICRO[name];
  if (!f) throw new Error("no micro " + name);
  let dispose: (() => void) | undefined;
  microAdj = -1;
  resetStats();
  const t0 = now();
  createRoot((d) => { dispose = d; f(n); });
  const t1 = now();
  flushOps(); // Solid flush + op send, reported separately
  const t2 = now();
  dispose!(); flushOps();
  const body = microAdj >= 0 ? microAdj : t1 - t0;
  return { nsPerIter: (body * 1e6) / n, flushNsPerIter: ((t2 - t1 - stats.sendMs) * 1e6) / n, sendNsPerIter: (stats.sendMs * 1e6) / n, ops: stats.ops };
}

export const microCmds: Record<string, (a: any) => any> = {
  abl: (a) => { const r = []; for (let i = 0; i < (a.reps ?? 1); i++) r.push(runVariant(a.v, a.cards ?? 91)); return { v: a.v, cards: a.cards ?? 91, runs: r }; },
  ablList: () => ({ variants: Object.keys(V), micro: Object.keys(MICRO) }),
  micro: (a) => { const r = []; for (let i = 0; i < (a.reps ?? 1); i++) r.push(runMicro(a.m, a.n ?? 5000)); return { m: a.m, n: a.n ?? 5000, runs: r }; },
};
