# 12. How much mount work can move to bundle time

Branch `spike/templates` (worktree `wt/templates`), on top of `spike/perf` at `5bda5b8`. This is a research spike: the code works and is tested, but it is off by default and not reviewed for landing. Nothing was pushed.

Benchmark app: `examples/perf_bench` (see its README and reports 10 and 11). All app numbers are release builds on Linux desktop x64, 4 cores, software raster under xvfb. The machine was shared with another job during every run: the 1-minute load average was 0.7 to 3.7. Ranges are therefore wide, and a difference under roughly 15% between two builds is not resolved. Each app cell is the median of 28 repetitions (4 interleaved passes of 7), with min to max in brackets. Each JS-only cell is the median of 27 (3 passes of 9).

"Baseline" is the same source tree built with `FUSE_TEMPLATES=0` and the same Dart build, so the only difference between columns is the JS bundle.

## Result

Milliseconds, median (min to max). "Templates" is the default configuration of the new option (`templates: true`).

| Operation | JS task baseline | templates | UI thread baseline | templates | End to end baseline | templates |
|---|---:|---:|---:|---:|---:|---:|
| mount 200 nodes | 4.61 (2.69–9.99) | 0.76 (0.49–4.46) | 12.2 (7.6–31.5) | 14.9 (8.1–35.9) | 28.2 (23.9–58.4) | 27.8 (23.8–48.9) |
| mount 1,000 nodes | 19.9 (12.4–56.0) | 2.10 (1.26–3.96) | 48.0 (32.2–62.8) | 45.0 (32.6–65.8) | 80.5 (64.7–117) | 60.6 (48.3–72.2) |
| mount 5,000 nodes | 112 (64–159) | 8.60 (5.56–21.3) | 209 (160–296) | 221 (175–306) | 340 (254–467) | 245 (189–337) |
| list replace 500 rows | 50.3 (38.1–84.5) | 25.5 (13.2–49.6) | 125 (93–167) | 121 (88–175) | 189 (154–257) | 155 (117–236) |
| one signal, 1 text node | 0.15 | 0.15 | 16.5 | 15.6 | 30.6 | 30.4 |
| one signal, 50 text nodes | 1.18 | 0.92 | 21.3 | 19.9 | 37.0 | 34.6 |
| one signal, 1,000 text nodes | 17.9 (9.4–36.6) | 13.5 (8.4–29.6) | 105 (67–158) | 105 (79–136) | 137 (83–194) | 138 (99–175) |
| one signal, 1,000 colours | 17.2 (10.3–35.6) | 18.1 (10.8–31.5) | 14.9 (9.3–24.1) | 14.3 (9.4–23.1) | 46.9 (26.5–64.7) | 46.5 (41.6–68.7) |
| sort 2,000 keyed rows | 53.3 (44.8–81.7) | 65.5 (44.4–93.4) | 119 (92–155) | 108 (95–151) | 193 (153–230) | 192 (160–248) |
| shuffle 2,000 | 48.3 (43.1–81.1) | 52.6 (42.0–85.9) | 115 (95–179) | 114 (95–153) | 183 (156–263) | 178 (156–254) |
| reverse 2,000 | 80.0 (69.1–125) | 80.7 (72.3–115) | 127 (97–169) | 124 (100–153) | 236 (175–305) | 226 (191–264) |
| filter 2,000 to 1,000 | 23.1 (18.9–34.9) | 21.3 (16.6–37.3) | 91.3 (74.0–121) | 90.4 (74.7–129) | 130 (104–163) | 126 (111–161) |

List-order checks (Dart tree against the JS array after replace, sort, shuffle, reverse, filter): 160 of 160 pass in every variant (40 per pass). No `[Fuse] ops error` line in any run.

Ops and bytes per operation (identical in all template variants):

| Operation | ops baseline | ops templates | bytes baseline | bytes templates |
|---|---:|---:|---:|---:|
| mount 200 | 401 | 39 | 16,709 | 2,490 |
| mount 1,000 | 2,007 | 185 | 84,224 | 12,554 |
| mount 5,000 | 9,993 | 911 | 421,001 | 63,650 |
| list replace 500 | 5,500 | 1,500 | 163,838 | 35,838 |
| updates, sort, shuffle, reverse, filter | unchanged | | unchanged | |

What the table says, in plain words:

- The JS task of a mount drops by about 10x on the card screen (which is almost entirely static once the compiler can see that) and by about 2x on the list (rows whose text the compiler cannot prove static).
- The UI thread does not get faster. Decode time drops (mount 5,000: 9.0 ms to 0.95 ms; apply 5.9 ms to 2.5 ms), but the Flutter frame (build, layout, paint) is 45 ms per 1,000 nodes in both columns and dominates. The mount 200 and mount 5,000 UI medians are higher with templates, inside the noise; I do not read them as a regression, but they are not an improvement either.
- End to end therefore improves by about the JS time saved: 20 ms of 80 at 1,000 nodes, 95 ms of 340 at 5,000, 34 ms of 189 for the list replace. At 200 nodes the saving (4 ms) is below one frame and does not show.
- Updates inside instances cost the same as before in this configuration. "1,000 colours" is not resolved in the app (17.2 against 18.1); the JS-only harness below puts it at 0 to 20% slower.
- The sort median (53 against 66) is noise: the minima are equal (44.8 and 44.4), the JS-only harness shows no difference, and a sort emits the same ops through the same code in both builds.

The same operations without Flutter (JS-only harness, real engine, `tools/harness.sh`), with the other variants. Load 1.0 to 2.6.

| JS ms | baseline | templates (default) | group=block | group=props | group=none | specialize=0 |
|---|---:|---:|---:|---:|---:|---:|
| mount 1,000 | 14.9 (12.4–24.7) | 1.98 (1.22–3.13) | 1.33 (1.15–2.91) | 1.35 (1.19–2.52) | 1.35 (1.14–2.63) | 3.27 (2.34–4.53) |
| mount 5,000 | 85.5 (78.1–126) | 7.07 (5.22–10.9) | 9.59 (5.26–15.3) | 6.66 (5.25–7.91) | 6.16 (5.15–11.3) | 15.8 (13.5–23.3) |
| list of 500 rows, mount | 35.6 (31.3–62.0) | 14.7 (10.0–39.3) | 13.1 (11.9–22.5) | 19.2 (16.1–30.4) | 18.4 (16.2–31.0) | 13.4 (10.3–38.5) |
| same, rows marked `/*@static*/` | 20.3 (14.6–25.9) | 5.63 (4.14–11.3) | 5.74 | 5.49 | 5.77 | 5.40 |
| list replace 500 | 41.2 (32.6–61.4) | 18.1 (12.7–27.2) | 14.7 (12.4–24.2) | 21.4 (17.2–30.3) | 21.3 (17.9–28.0) | 15.9 (12.5–22.3) |
| one signal, 1,000 texts | 8.28 (7.31–13.5) | 7.62 (6.30–10.4) | 10.8 (9.7–16.9) | 6.76 (6.19–12.9) | 10.2 (6.5–12.7) | 6.64 (6.29–11.2) |
| one signal, 1,000 colours | 9.19 (8.27–14.5) | 11.1 (9.0–18.6) | 11.4 (10.9–18.8) | 9.20 (8.83–11.6) | 12.1 (8.7–19.3) | 10.4 (9.0–21.9) |
| sort 2,000 | 49.8 (44.1–98.7) | 44.3 (42.4–69.8) | 50.1 | 44.3 | 46.6 | 46.4 |
| filter 2,000 to 1,000 | 19.1 (16.8–32.2) | 15.8 (14.2–25.4) | 16.3 | 16.4 | 16.8 | 15.8 |

Per node, from the minima and medians above: the card screen goes from about 15 µs per node to 1.3–2 µs per node. A list row of 5 nodes goes from about 70 µs to 20–29 µs, and to 8–11 µs when its two text holes are marked static. (The `/*@static*/` marker helps without templates too: 35.6 to 20.3 ms in the baseline column.)

One mount of 1,000 nodes allocates 5,555 JS objects and 1.05 MB of heap in the baseline, and 394 objects and 89 KB with templates (one harness run each, first mount, `obj0/obj1` and `heap0/heap1` in the raw lines).

Bundle size: `examples/demo` is 97.57 kB without templates and 102.13 kB with (gzip 24.73 to 26.46 kB). The runtime support is about 5 kB before minification; the per-block code gets smaller, which does not make up for it in a small app. In `perf_bench`, where the runtime support is linked in either way (the micro benchmarks call it), the bundle goes from 151.07 kB to 149.82 kB.

## How the pipeline is put together, and where one can hook in

This part is from reading the code of the installed versions, not from measurement.

`fuse dev` and `fuse build` build a Vite config (`packages/solid-fuse/cli/config.ts`) with `vite-plugin-solid` 3.0.0-next.5, `generate: "universal"` and `moduleName: "solid-fuse"`. The Solid plugin runs each `.tsx`/`.jsx` file through one Babel `transformAsync` with `babel-preset-solid`, which is `babel-plugin-jsx-dom-expressions` 0.50.0-next.13. In dev it adds `solid-refresh` to the same pass.

What the JSX compiler emits differs a lot between its two modes:

- `generate: "dom"` hoists the static HTML of a block into a module-level `template("<div>…")`, clones it per instance and walks to the dynamic nodes (`firstChild`, `nextSibling`). Static shape costs nothing per instance in JS.
- `generate: "universal"` (ours) has no template notion. It emits `createElement`, `setProp` and `insertNode` for every node and every prop, static or not, one `effect` per block for all its dynamic props, and one `insert` (with its own effect) per dynamic child. It classifies an expression as dynamic if it contains a call or a member access; `/*@static*/` in front of an expression overrides that.

Hook points, from most to least principled:

1. **Inside the JSX compiler** (a `templates` capability in the universal generator of dom-expressions). This is the right home: the compiler already knows the block, its static and dynamic parts and its scoping. It needs an upstream change.
2. **A Babel plugin in the same pass, before the preset** (`solid.babel.plugins`). This is what the spike uses, next to the existing `inlineWrappers` plugin. It sees one file at a time, runs before the Solid transform, and replaces a JSX block with a call; whatever it leaves alone (components, fragments, fallbacks) the Solid transform compiles as before. Plugins and preset share one traversal, so the plugin does its work in `Program.enter` to be sure it runs first.
3. **A Vite `transform` plugin** before or after the Solid plugin. Before, it would have to parse TSX itself (a second Babel pass per file). After, it would be pattern-matching generated code, which breaks with every compiler release. Not used.
4. **Rollup/Rolldown bundle hooks** (`renderChunk`, `generateBundle`, `closeBundle`). These see the whole bundle. Good for whole-program facts and for output-level work (the bytecode cache already lives after this stage, at first run on the device). The spike uses `closeBundle` only to print the counters.

What is per-file and what is not: the Babel plugin knows bindings in its own module only. It can prove that `COLORS` is a module constant table, or that `Card` is a local component called with static props. It cannot know what an imported component does with its props, whether `r.name` is a plain field or a store getter, or whether an imported function is pure. Cross-module facts would need a Vite plugin that builds them from the module graph before transforming (two passes, and in dev an invalidation rule: when the fact about module A changes, every importer compiled with that fact must be re-transformed). TypeScript types are not available in this pipeline at all (Babel strips them).

What Vite can do, as opposed to the JSX compiler: constant folding via `define`, tree shaking, minification, module-graph facts via plugin hooks, and the HMR boundaries. It cannot hoist JSX shape; that is a JSX-compiler job.

Hot reload: a template is a module-level constant. In a hot update the module is evaluated again in the same engine, its template constants are new objects, and each registers itself again (under a new id) on first use. A full reload creates a new JS context, which starts numbering at 1 and replaces the stored shapes. Both cases are covered by tests (JS: "a template is sent once per JS context and again by a re-evaluated module"; Dart: "a template id sent again replaces the template"). In a long dev session the Dart side keeps the shapes of replaced modules until the next full reload; they are small. I checked that the dev transform (Vite dev server, `solid-refresh` on) produces templates for the demo's files. I did not run a dev session on a device.

## What was built

Config: `templates?: boolean | { group?, pure?, specialize? }` in `fuse.config.ts`, off by default; `FUSE_TEMPLATES=1|0|group=block,…` overrides it for one build. The build prints the counters (`[fuse] templates: …`).

**Compiler** (`packages/solid-fuse/cli/template-plugin.ts`, 748 lines). For each JSX block of native elements it emits a module-level constant holding the shape, and replaces the block by one call:

```js
const _tpl$ = /*#__PURE__*/_tpl("[\"view\",0,[\"color\",0,\"w\",1],[[\"text\",0,0,[2]]]]", 3, "view", [/* hole table */]);
…
return _inst(_tpl$, [COLORS[1], Math.max(1, 2), String(3)]);          // all values static: no effect
return _inst(_tpl$, [once…], () => [r.name, `${r.value}`]);           // reactive values: one effect
```

Identical shapes in a module share one template. Each expression in the block becomes a hole of one of four kinds: a prop, a text that is provably a string, a child of unknown type (with a reserved text leaf, so a string or number does not go through Solid's `insert`), or a child that is certainly a node (a component, a fragment, nested JSX). Static holes are evaluated once and travel in the instance op. Reactive holes are grouped into effects; the grouping is an option (below). Conditional children (`a() ? <X/> : <Y/>`, `a() && <X/>`) are handed to Solid by wrapping them in a fragment, so its memoised-condition logic is reused rather than copied. Refs follow Solid's three cases and run after the instance exists.

**Runtime** (`packages/solid-fuse/src/renderer.ts`, +558 lines): `_tpl`, `_inst`, `_instH`, `_node`. An instance is one JS object for the root. Inner nodes get a JS object only when something needs one: a hole that takes child nodes, or a ref. Updates use the ordinary `setProp` and `setText` ops addressed by id, and handlers use the existing handler map.

**Dart** (`runtime.dart` +136, `node.dart` +15): op 9 stores a parsed shape; op 10 `[10, tplId, rootId, values, component]` creates the subtree. Node ids are `rootId + pre-order position`, so JS and Dart agree on every id without sending them.

**Fallback.** A block with a spread attribute, a namespaced attribute, a `children` attribute or a spread child is left to the Solid compiler; elements inside and around it are still templated. Counts:

| App | JSX blocks | templates | nodes in templates | constant / evaluated once / reactive | holes once / reactive | effects | left to Solid | static-props copies | not templated |
|---|---:|---:|---:|---|---|---:|---:|---:|---|
| `examples/perf_bench` | 38 | 32 | 114 | 5 / 18 / 15 | 45 / 53 | 25 | 3 conditionals | 2 | 1 (spread) |
| `examples/demo` | 11 | 10 | 123 | 0 / 4 / 7 | 34 / 17 | 11 | 0 | 0 | none |

`examples/demo` builds with the option on. I added a Linux target to it temporarily, ran the release build under xvfb with both bundles, and compared screenshots of the home screen and of the state after tapping "counter": pixel-identical in both states. (After that tap the window is blank with both bundles, so the demo's inner screens were not exercised on Linux; that is the same without templates and I did not look into it.)

## What moved to bundle time, and what could not

Moved:

- **The shape of every block of native elements**: element types, constant props, static text, parent-child structure. Before, each of these was a JS call, a JS object, and one or more ops per instance. Now it is a string in the bundle, sent once.
- **The static/dynamic decision per expression**, including two things the Solid compiler does not attempt: calls of pure globals with static arguments and lookups in module-level literal tables count as static (`pure`), and a same-module component called with only static props gets a copy in which reads of `props.x` are static (`specialize`).
- **Which nodes need a JS object at all** (those with child holes or refs).
- **The grouping of reactive values into effects.**

Could not move, and why:

- **The effect for a value that might be reactive.** `r.name` may be a plain field or a store getter; a per-file compiler without types cannot tell. One effect costs 9–12 µs to create in QuickJS (measured, `effect_static` and `effect_tracking` micro benchmarks), which is now most of the cost of a reactive instance. The ways out are a promise from the author (`/*@static*/`), a proof by the compiler (`pure`, `specialize`), or a change in Solid: an effect that is only allocated if its first run actually read something reactive. There is no public API for that probe today, so this was not built; it is the largest remaining lever on the JS side and it is upstream.
- **Components, owners, `<For>` and `<Show>`.** How many rows there are and which branch is shown are run-time facts. A row from `<For>` costs about 8–11 µs even when the row itself is free (static-row figure above; that includes the row's instance, roughly 3 µs by the `tpl_once2` micro benchmark; the split is an estimate).
- **Everything Flutter does.** Widget build, layout and paint are 45 ms per 1,000 nodes and unchanged. After this work the JS task is 3% of a 1,000-node mount; the frame is about 70%.
- **Cross-module facts**, for the pipeline reason given above. In `perf_bench` the static-props copy is what takes the card screen from 3.3 ms to 2.0–1.3 ms, and it only works because `Card` and its caller are in one file.

## Per idea

"Effect" is on the JS task unless said otherwise. LOC counts exclude tests (648 lines of JS tests, 136 of Dart tests cover all rows together).

| Idea | Effect (measured unless marked) | LOC | Risk | Landable? |
|---|---|---:|---|---|
| Compiler templates: shape once, one op per instance | mount 1,000: 14.9 → 3.3 ms; list rows 35.6 → 13–19 ms; ops 2,007 → 185, bytes 84 KB → 12.5 KB; decode 1.8 → 0.3 ms | ~1,400 (plugin 750, JS runtime 560, Dart 150) | High as a whole: it re-implements part of what the Solid compiler does for a block, and must track its semantics | As an experimental option, after review. Long-term it belongs in the JSX compiler |
| Fully static subtrees (no holes) | 1.7 µs per 5-node instance (`tpl_const5`), against about 75 µs for 5 nodes before | part of the above | Low | Yes, the safest part; could land alone |
| Values evaluated once travel in the instance op (no effect) | 2.7–2.9 µs per instance with 2 such values (`tpl_once2`) against 20–22 µs with one effect (`tpl_dyn2_static`) | part of the above | Low; same classification rule as Solid | Yes |
| Static-props copy of a local component ("islands") | card screen 3.3 → 2.0 ms at 1,000 nodes, 15.8 → 7.1 ms at 5,000. No effect on the list or on the demo (0 call sites there) | ~120 in the plugin | Medium: sound for Solid props, but the copy doubles the component's code | Maybe. Useful only when component and caller share a file |
| Pure globals and constant tables count as static | Tested and correct, but it changed nothing in `perf_bench` by itself: the `pure=0,specialize=0` bundle is byte-identical to the `specialize=0` one. It matters only together with the static-props copy (`COLORS[p.i % 8]` is static only once `p.i` is) | ~60 | Low to medium: relies on a list of globals assumed pure | Only with the row above |
| One effect per group of values that read the same source (`group: "roots"`, default) against one per value | list rows: 14.7 ms against 18.4 ms (`none`) and 19.2 ms (`props`, which is Solid's own split) for 500 rows, i.e. about one effect per row saved. Updates: about neutral for texts; "1,000 colours" 9.2 → 11.1 ms, because values in a group are re-evaluated together | ~80 | Medium: a heuristic. A group re-runs when any member changes | Yes as the default; the trade is visible in the update figure |
| One effect for the whole block (`group: "block"`) | Fastest mount for rows (13.1 ms) but clearly slower updates: 1,000 texts 8.3 → 10.8 ms, 50 texts 0.57 → 0.90 ms | option | — | No. Kept as an option only to show the trade |
| Text child without Solid's `insert` (reserved text leaf) | 26–28 µs for a dynamic text through `insert` (`insert_dynamic_text`) against roughly 5 µs added to an instance that already has an effect (`tpl_dyn2_child` 23 µs against `tpl_dyn1_prop` 20 µs); "1,000 texts" update 8.3 → 7.6 ms | ~90 in the runtime | Medium: non-primitive values fall back to `insert` at run time, and that hand-over is the subtlest code in the spike | With the templates |
| Object-literal props compared by content before re-sending | Removes re-sends that grouping would otherwise cause; needed for the update figures, not a gain of its own | ~25 | Low | With the templates |
| JS node objects only where needed | Included in the template figures; 5,555 → 394 objects per 1,000-node mount | part of runtime | Medium: `_node` materialises a node lazily and must mirror the child list | With the templates |
| Interned constant prop objects | Not built separately. Inside a template, constant props are stored once in Dart and shared by all instances, which is the same thing done better. Outside templates (fallback blocks) nothing changed | 0 | — | Subsumed |
| Pre-serialised op fragments | Not built. With templates a 1,000-node mount is 12.5 KB of JSON and 0.3 ms of decode; the static part no longer travels per instance, so there is little left to pre-serialise. Estimate: below 0.5 ms per 1,000 nodes | 0 | — | Did not matter |
| Binary or flat buffer instead of JSON | Not built. The bound is the same: decode is 0.3 ms of a 60 ms mount (measured); JS-side stringify of 12.5 KB was not measured separately | 0 | — | Did not matter after templates |
| Hand-wired template op from report 11 (`listPrepTpl`) | 4.3–5.6 ms for 500 rows; the compiler output with static rows reaches 5.4–5.8 ms | existing | — | Superseded by the compiler path; ops 7/8 can be removed |

## What a node still costs in JS

From the micro benchmarks (5,000 iterations, 27 repetitions; µs, median):

| Piece | µs |
|---|---:|
| An instance of a constant 5-node template | 1.7 |
| An instance with 2 values evaluated once | 2.8 |
| The same plus a text child | 4.4 |
| A component child at a hole | 5–6 |
| An instance with 2 reactive values in one effect | 20–22 (24–31 if the values are signals that track) |
| The same with one effect per value | 33 |
| A Solid effect alone | 9.6 (11–12 tracking) |
| A signal | 2.8 |
| `createComponent` | 0.5 |

So a block that the compiler can prove static costs about 0.3–1.5 µs per node, and a block with anything reactive costs one effect (about 10 µs) plus about 8–10 µs for the closure, the first evaluation, the comparison state and the instance, regardless of how many nodes it has. That second figure is what is essential with Solid as it is: the remaining cost is per reactive block and per component, no longer per node or per prop.

## How principled each piece is

- **The wire format and the Dart side** (shape once, instance op, ids by position) are simple and I would keep them as they are. 11 Dart tests cover them, including disposal, handles, handlers on inner nodes, nested instances and re-definition.
- **The Babel plugin** is principled in what it emits but is in the wrong place. It duplicates the Solid compiler's classification of expressions and its handling of refs, text, and conditionals, and it must be kept in step with `babel-plugin-jsx-dom-expressions`. I limited the duplication by delegating everything that is not a native element (components, fragments, conditionals, spreads) back to the Solid compiler. The differential tests are what make this tolerable: every sample is compiled with and without templates, mounted, stepped through updates, and the resulting trees compared, in all four grouping modes (87 tests).
- **The child-hole runtime** (`computeChild`, `applyChild`, the hand-over to Solid's `insert` for non-primitive values) is the hackiest part. It mirrors internal behaviour of `@solidjs/universal`'s `insert` (the nested effect for accessors, the marker logic for adjacent holes). It passes the differential tests, but it is where I would expect a bug with shapes I did not think of.
- **`group: "roots"`** is a heuristic with a visible trade, not a proof.
- **`specialize`** is a sound transformation for Solid props, but it is whole-program reasoning squeezed into a per-file tool, and it duplicates component code.
- **`pure`** rests on a hand-written list of globals.

## Limits and what was not measured

- Noisy machine (load up to 3.7), Linux desktop only, software raster. No phone. On a phone the JS thread is slower relative to the UI thread, so the share saved should be larger, but that is an expectation, not a measurement.
- The decode column for very small batches (mount 200, single-signal updates) shows a median of about 3 ms for a few hundred bytes in every build including the baseline, with minima of 0.06–0.1 ms. That is a timing artefact of the benchmark for small batches, not a cost of templates; it does make the mount-200 UI figure look worse than it is.
- Holes whose value is pending (async, `<Loading>` boundaries) are not covered by tests. Neither are transitions.
- Handlers of removed instances stay in the handler map as they did before (existing behaviour, not made worse, not fixed).
- Dev mode and hot reload were checked at the transform level and by tests of re-registration, not in a running dev session on a device. The dev-only component-name path was exercised by one Dart test only.
- `examples/demo` was compared on its home screen only (see above).
- JS-side JSON stringify cost was not measured separately, so the binary-buffer row is a bound from decode time and batch size.
- Cross-module analysis was not attempted.
- `flutter analyze` reports the same 26 issues as the base branch; `test/widget_test.dart` in the Dart package fails to compile on the base branch too (it refers to a `MyApp` that does not exist) and was not touched. `bun test` over the whole package hangs in `src/navigator.test.ts` as before, so tests were run per file.

## Rerun

```bash
export PATH=/opt/flutter/bin:$PATH
cd packages/solid-fuse
bun test --conditions browser cli/template-plugin.test.ts     # 87 tests: output + differential
bun test --conditions browser src/renderer.test.ts
(cd dart && flutter test test/apply_ops_test.dart test/node_widget_test.dart)
bun cli/_compile.ts some.tsx '{"group":"roots"}'              # print the compiled output of one file

cd ../../examples/perf_bench
BUNDLES=/path/to/bundles tools/r12-bundles.sh                  # base, roots, block, props, none, roots-nospec, roots-plain
(cd dart && flutter build linux --release --no-tree-shake-icons)
# per variant: copy the app bundle directory, replace data/flutter_assets/assets/js/bundle.js, then
BIN=/path/to/12-roots/perf_bench tools/run.sh core 7 results/r12/core-roots-a.txt
python3 tools/r12-core.py results/r12 base roots block props none roots-nospec     # pooled tables

# JS only (harness binary: libfjs test binary, see tools/harness.sh)
python3 tools/r12-cmds.py > /tmp/r12-cmds.jsonl
BUNDLE=/path/to/bundles/roots.js tools/harness.sh <harness-binary> /tmp/r12-cmds.jsonl results/r12/h-roots-a.txt
python3 tools/r12-agg.py results/r12/h-base-a.txt results/r12/h-roots-a.txt

# any app
FUSE_TEMPLATES=1 bun fuse build --js-only                      # prints the counters
```

Raw results: `results/r12/core-<variant>-<a..d>.txt` (app), `results/r12/h-<variant>-<a..c>.txt` (JS only), pooled tables in `results/r12/core-pooled.md` and `results/r12/harness-pooled.md`.
