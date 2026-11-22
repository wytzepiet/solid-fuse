# 17. Templates on main, and where the remaining mount cost is

2026-11-22. Landed on `main`: `eb247e4` (node lifetime), `4096002` (templates, wrappers as elements).

All numbers: JS-only harness (real QuickJS through fjs, opt-level 3 build, no Flutter), one shared Linux x64 VM, noisy (ranges of ±20% between runs). "1,000 nodes" is 91 cards of `examples/perf_bench` (`Card`: 7 elements, 4 dynamic texts, 1 dynamic prop).

## What landed

1. **Node lifetime.** `remove` only detaches. Dart disposes a node when the JS garbage collector reports that JS let go of it (`FinalizationRegistry` on detached subtree roots, on nodes referenced by props, on nodes with handlers). Verified that QuickJS-ng in fjs runs finalisers for cyclic garbage. Handlers live on their node, found through a weak id map. Ops from a previous evaluation of the bundle are dropped.
2. **Compile step** (`cli/compile-plugin.ts`, a Vite `enforce: "pre"` plugin in front of Solid's native compiler, using Vite's oxc parser and magic-string):
   - pass-through wrappers (`View`, `Text`, ...) compile as their element;
   - the constant part of a JSX tree becomes a template (`define` once, `instantiate` per use); elements with anything dynamic stay in the JSX as `<h$tag $t={instance} $i={index}>` and are compiled by Solid's compiler as ordinary elements. The plugin never decides how something dynamic behaves.
3. **Tests.** 13 fixtures compiled three ways (plain, wrappers only, templates) must give the same tree after mount and after each of 10 update steps; the templated batches are replayed through the real Dart `applyOps`.

Design differences from the old spike (report 12): no copy of Solid's reactivity rules (the spike generated its own effects and child-hole runtime), no purity or specialisation assumptions, source maps and line numbers preserved, about 330 lines of plugin and 60 of runtime against 748 and 558.

## Numbers

| JS ms, median | main before (c6) | wrappers as elements | + templates |
|---|---:|---:|---:|
| mount 1,000 nodes | 25.1 | 15.2 | 13.1 |
| mount 5,000 nodes | 139 | 93.5 | 72.9 |
| list replace 500 rows | 65.0 | 45.4 | 35.8 |
| sort / shuffle / reverse / filter 2,000 | unchanged within noise | | |
| batch bytes, mount 1,000 | 81,132 | 81,132 | 22,928 |

A fully static card (`card_static`) mounts 1,000 nodes in 2.6 ms; the same card through `<For>` with its five dynamic values takes 10.7 ms in the same run.

## Where the rest goes

Micro benchmarks in the same engine (ns per call, median of 5 × 5,000):

| | ns |
|---|---:|
| closure | 300–560 |
| `createComponent` | 800 |
| `createElement` | 1,500 |
| `createOwner` | 1,800–2,100 |
| `createSignal` | 1,600–2,600 |
| `createRenderEffect` (any options) | 7,400–13,000 |
| `createMemo` | 9,100–10,500 |
| compiler-emitted `effect` (static compute) | 10,300–12,900 |
| same, reading one signal | 14,600 |
| `insert(el, () => "abc")` (a dynamic text) | 23,800 |

So one card of 145 µs spends about 110 µs creating five reactive bindings. A Solid 2.0 computation is an object with about 30 fields plus scheduling, ownership and async bookkeeping; in an interpreter that is about 10 µs whatever the options. Build target `esnext` instead of `es2020` did not help (within noise, possibly worse).

## Options considered for the binding cost, and why none is landed

- **One shared effect per template instance, done at run time** (collect the compiler's `effect`/`insert` calls while an instance is built). Rejected: a shared effect re-runs every expression of the instance when one dependency changes, and Solid disposes everything a compute created before re-running it. A dynamic child that renders a `<For>`, a `<Show>` or JSX would be re-created when an unrelated sibling value changes. Limiting it to props is Solid 1's behaviour (same wart for JSX-valued props) and helps only instances with several dynamic props.
- **Start shared, split into per-value effects at the first change.** Moves the cost from mount to the first update and still re-evaluates each expression once more at that moment (observable for node-producing expressions).
- **Skip the effect when the first run read nothing reactive** (the benchmark's `p.i` is a plain prop). This is the right fix and would bring the card screen to roughly 3 ms, but it needs a way to ask "did this function read anything reactive" without allocating a computation. Solid's production build has no such hook (`setReadWatch` is a dev no-op; no API runs a function under a reusable observer). It is an upstream change in `@solidjs/signals`.
- **A fast path for single dynamic text children.** Would save about 6 of the 24 µs per text; needs a re-implementation of part of Solid's `insert`. Not worth the risk for about 15%.

## Follow-ups

- Raise static binding elision with Solid (above).
- Lists: mount only what is near the viewport (the `slivers` branch has the Flutter side). This removes the peak for long lists regardless of per-node cost.
- Nodes created but never inserted are still never disposed on the Dart side unless they carry a handler or are referenced by a prop.
- `FuseNode.children` in JS lists only nodes JS manages (template nodes without a JS node are absent).
- The wrapper rename does not detect a local binding that shadows the import.
