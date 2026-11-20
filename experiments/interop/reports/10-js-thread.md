# 10 — Is a busy JS thread a real problem? Measurements

Branch `spike/perf` (worktree `/home/claude/wt/perf`, local commits on top of `450bb3f`, not pushed).
Benchmark app: `examples/perf_bench` (README there explains how to rerun). Raw output of every run quoted here: `examples/perf_bench/results/`.

## Verdict

1. **The JS thread does get blocked for a long time at realistic sizes.** Mounting 1,000 nodes is a 78 ms uninterrupted JS task on this desktop machine (4.7 frames); replacing a 500-row list is 196 ms; mounting 5,000 nodes is 477 ms. Anything JS-driven freezes for exactly that long. A 200-node screen is already one frame. The assumption holds.
2. **But a busy JS thread is only half the story, and it is the half that does not hurt Flutter-owned work.** With JS spinning for a full second, a Dart-owned drag, scroll-linked header and text field were indistinguishable from idle. What does hurt Flutter-owned work is the *result* of the JS work: the op batch is received, decoded and built on the UI thread. A 5,000-node mount keeps the UI thread busy for about 316 ms (142 ms decoding the batch, 163 ms building), and a Dart-owned drag froze for 335 ms while it landed. Moving code from TS to Dart does not remove that cost.
3. **A TS translation layer over one native node is close to free.** A 20-prop wrapper that renames, defaults and expands shorthands costs 0 to 100 µs of JS per component at mount, sends the same ops, and costs the UI thread nothing extra. Doing the same mapping in Dart saves about 30 µs per component.
4. **Composing a curated component out of several generated primitives in TS is not free.** Each extra node costs about 85 µs of JS, about 30 µs of UI thread and about 215 bytes on the wire. A 12-node composition is 3.5 times the JS and 2 times the UI-thread time of the one-node version: +0.94 s of JS for a 1,000-row list.
5. **JS-driven interaction is not reliably fine even when JS is idle.** Drag: fine (+2.5 ms). Scroll-linked header: always one frame behind. Controlled text field: types correctly at the end of the text, but editing in the middle produces wrong text and a jumped cursor with no load at all.

Recommendation, argued below: write the curated layer **in TS as thin wrappers over a small number of fat Dart primitives (one node per curated component)**; keep anything that must track a pointer, a scroll position or a text edit **in Dart**; and treat node count and op-batch size, not the language of the mapping, as the thing to budget.

## Setup

| | |
|---|---|
| Machine | 4 cores, Intel Xeon 2.1 GHz (cloud VM), Linux, shared with another agent's jobs |
| Build mode | **Flutter release** (AOT) for every number in this report. `flutter build linux --release`, binary run under `xvfb-run` |
| Engine | vendored fjs, Rust release profile (`opt-level = "z"`, LTO), QuickJS, bundle loaded as bytecode |
| JS bundle | `fuse build --js-only` (the CLI's Vite config, production mode), 112 KB unminified |
| Versions | Flutter 3.50.1, Dart 3.14.0, Solid 2.0.0-beta.14 |
| Window | 412 x 892 logical px, device pixel ratio 1 |
| Rendering | llvmpipe software rasteriser under xvfb. **Raster times are not representative** and are reported only to explain missed vsyncs |
| Priority | benchmark process run with `nice -n -10` so other jobs disturb it less |
| Load average | recorded with every measurement; 0.7 to 3.4 during the quoted runs. Earlier trial runs at load 4.4 to 5.4 gave the same JS times within 20% (1,000-node mount 92 to 99 ms, 5,000-node 411 to 479 ms) |

Clocks: `performance.now()` inside QuickJS for JS time; `Timeline.now` (the clock `FrameTiming` uses) for everything in Dart. No cross-clock subtraction is used except where stated.

In release mode `host.mode` is `"release"`, so the renderer does not track the owning component of each node. Profile and debug builds do and are slower in JS; they were not measured.

Two things in the framework had to change to take these measurements (both in `packages/solid-fuse`, on the spike branch):

- `FuseRuntime.perfOnOps` and `perfChannels`: an instrumentation hook, null in normal use.
- **A bug fix: reordering a keyed list did not work.** Solid's reconciler moves a row as `removeNode` followed by `insertNode` of the same node. Dart's `applyOps` disposed the node on `remove`, so the following `insert` threw (`Null check operator` in `FuseNodeRegistry.get`), the rest of the batch was dropped and the screen went stale. Sort, shuffle, reverse and then filter all failed. The fix defers disposal to the end of the batch and makes `insert` detach a still-attached child first (both sides). With it, the Dart node tree matched the JS order in 16 of 16 checks after sort, shuffle, reverse and filter. No unit test covers `applyOps`; the fix is verified only by that check.

## 1. How long are JS tasks?

"JS task" is uninterrupted time inside QuickJS: the operation, Solid's flush, and handing the op batch to the bridge. "End to end" is from Dart sending the command to the UI thread finishing the frame that shows the result (it includes waiting for the next vsync, 0 to 16.7 ms, and excludes rasterisation). Cells are `min / median / max` in ms over 14 runs (two sets of 7, 20 minutes apart; 42 for `update_*`, 28 for `list_replace`). Load average 0.9 to 1.9.

A "card" is 11 nodes: 3 views, 4 text elements, 4 text leaves, with padding, decoration, flex, font props. Lists are not virtualised (solid-fuse has no lazy list on this branch): every row is built.

| Operation | Nodes created | Ops | JS task ms | JS task, frames | of which `bridge_call` | Dart decode ms | Frame build ms | UI thread busy ms | End to end ms | Frames |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Mount 50 nodes | 46 | 170 | 3.4 / **5.2** / 7.3 | 0.3 | 1.7 | 1.1 | 2.6 | 3.9 | 18.5 / **19.9** / 54.9 | 1.2 |
| Mount 200 nodes | 200 | 744 | 14.2 / **17.4** / 29.6 | 1.0 | 5.9 | 4.7 | 7.5 | 13.4 | 39.4 / **56.2** / 59.4 | 3.4 |
| Mount 1,000 nodes | 1,003 | 3,737 | 67.5 / **78.4** / 137 | 4.7 | 25.9 | 27.1 | 33.0 | 60.9 | 162 / **188** / 268 | 11.3 |
| Mount 5,000 nodes | 4,996 | 18,620 | 431 / **477** / 614 | 28.6 | 130 | 142 | 163 | 316 | 931 / **1,010** / 1,215 | 60.6 |
| Unmount 5,000 nodes | – | 3 | 13.6 / **20.9** / 29.4 | 1.3 | 0.1 | 0.1 | 27.9 | 29.3 | 54.2 / **61.6** / 82.8 | 3.7 |
| One signal, 1 text node | – | 1 | 0.1 / **0.2** / 33.4 | 0.0 | 0.1 | (noise) | 10.0 | 13.6 | 22.0 / **26.7** / 60.2 | 1.6 |
| One signal, 50 text nodes | – | 50 | 1.1 / **1.8** / 13.7 | 0.1 | 0.4 | 0.3 | 13.8 | 14.4 | 27.1 / **31.2** / 53.3 | 1.9 |
| One signal, 1,000 text nodes | – | 1,000 | 17.5 / **21.9** / 33.1 | 1.3 | 5.2 | 3.6 | 80.7 | 85.1 | 102 / **132** / 180 | 7.9 |
| One signal, 1 colour prop | – | 1 | 0.2 / **0.2** / 2.6 | 0.0 | 0.1 | (noise) | 4.8 | 8.6 | 20.2 / **21.5** / 68.0 | 1.3 |
| One signal, 50 colour props | – | 50 | 1.5 / **2.0** / 6.5 | 0.1 | 0.7 | 0.4 | 5.4 | 5.9 | 20.1 / **22.3** / 31.4 | 1.3 |
| One signal, 1,000 colour props | – | 1,000 | 24.6 / **30.7** / 44.4 | 1.8 | 10.2 | 8.3 | 10.8 | 20.3 | 58.9 / **76.9** / 94.4 | 4.6 |
| Replace a 500-row list (2,500 nodes) | 2,500 | 8,000 | 168 / **196** / 280 | 11.7 | 56.3 | 66.1 | 91.4 | 160 | 404 / **459** / 579 | 27.5 |
| Sort 2,000 keyed rows (10,000 nodes) | 0 | 3,268 | 85.7 / **91.8** / 140 | 5.5 | 19.1 | 19.9 | 92.1 | 130 | 235 / **282** / 376 | 16.9 |
| Shuffle 2,000 keyed rows | 0 | 3,262 | 82.2 / **89.5** / 121 | 5.4 | 19.0 | 21.2 | 93.0 | 128 | 226 / **285** / 367 | 17.1 |
| Reverse 2,000 keyed rows | 0 | 1,999 | 118 / **132** / 182 | 7.9 | 11.6 | 10.0 | 97.5 | 136 | 255 / **304** / 380 | 18.2 |
| Filter 2,000 keyed rows to 1,000 | 0 | 992 | 38.8 / **43.6** / 62.9 | 2.6 | 5.2 | 3.2 | 81.5 | 95.2 | 143 / **164** / 209 | 9.9 |
| `JSON.parse`, 100 KB | – | – | 2.4 / **3.1** / 12.8 | 0.2 | | | | | | |
| `JSON.parse`, 1 MB | – | – | 22.1 / **33.3** / 40.7 | 2.0 | | | | | | |
| `JSON.stringify`, 1 MB | – | – | 16.1 / **18.8** / 30.9 | 1.1 | | | | | | |
| Navigation push, 200-node screen | 201 | 746 | 13.3 / **19.4** / 25.2 | 1.2 | 5.0 | 4.8 | 8.7 | 14.6 | 39.8 / **53.3** / 67.9 | 3.2 |
| Navigation push, 1,000-node screen | 1,004 | 3,739 | 69.0 / **85.4** / 150 | 5.1 | 30.0 | 26.8 | 31.8 | 59.0 | 172 / **200** / 254 | 12.0 |
| Navigation pop | – | 1 | 0.8 to 3.6 (median) | 0.2 | | | 1.9 to 6.6 | | 22.5 to 28.2 | 1.5 |

"Dart decode" is how long the UI isolate's event-loop turn had already been running when `applyOps` started, that is, receiving the batch and turning it into Dart maps. It is taken from a 1 ms heartbeat, so values under about 5 ms are noise. `applyOps` itself is negligible (0.2 µs per op, 4.5 ms for 18,620 ops) and is included in "UI thread busy".

**Exceed one frame (16.7 ms) of JS on this machine:** mounting 200 nodes or more; updating about 700 nodes or more from one signal; every list operation measured; a 1 MB JSON parse; a navigation push of a 200-node screen (just).

**Exceed 100 ms of JS:** mounting 5,000 nodes; replacing a 500-row list; reversing 2,000 rows. Mounting 1,000 nodes is 78 ms median, 137 ms worst. **Exceed 100 ms end to end:** all of those plus mounting 1,000 nodes (188 ms), updating 1,000 text nodes (132 ms), and every 2,000-row list operation.

Where a mount goes, per node, from the 5,000-node row: about 95 µs of JS (26 µs of it inside `fjs.bridge_call`, converting the op objects to Rust values), about 70 µs between JS finishing and Dart's handler starting (28 µs of it is the decode on the UI isolate; the rest is Rust-side serialisation and thread hand-over and was not split further), and 33 µs to build. JS is 47% of the end-to-end time, the UI thread 31%.

Notes on individual rows:

- Updating **one** text node in a 1,000-row screen costs 10 ms of UI-thread frame time, because the text change re-lays-out the whole unvirtualised column. That is Flutter's cost, independent of JS.
- Sorting is cheaper in JS than mounting but keeps the UI thread busy 130 ms: the column of 2,000 rows is rebuilt and repainted.
- JSON parsing is not the problem it is assumed to be: 33 ms for 1 MB.

## 2. What does a TS translation layer cost?

The component is a curated `Box` with 20 friendly props (`p`, `px`, `py`, `m`, `mb`, `bg` as a tone name, `radius` as a size name, `border`, `borderColor`, `shadow` as a size name, `w`, `h`, `minH`, `maxW`, `row`, `gap`, `align`, `justify`, `center`, `opacity`, `hidden`). Source: `examples/perf_bench/src/box.tsx`. Variants:

| | Variant | Nodes per component |
|---|---|---:|
| (i) | the fat Dart `View`, props written by hand in `View`'s own vocabulary | 1 |
| (i') | friendly props sent raw, mapped by a Dart widget (`benchBox`): the curated layer in Dart | 1 |
| (ii-a) | TS wrapper, one JSX attribute expression per `View` prop | 1 |
| (ii-b) | TS wrapper, a memo per composite prop (padding, margin, decoration, flex), so an unrelated change resends nothing | 1 |
| (ii-c) | TS wrapper, naive: one memo maps everything, the result is spread | 1 |
| (iii) | composed in TS from generated primitives: 3 (`DecoratedBox > Padding > Column`), 6 (adds `Opacity`, `SizedBox`, `Align`), 12 (adds margin `Padding`, `ConstrainedBox`, foreground `DecoratedBox`, `ClipRRect`, and two visual no-ops, `Flexible(flex: 0)` and a transparent `ColoredBox`, to reach 12) | 3, 6, 12 |

Three feature levels use 3, 11 and 17 of the props, so each composed variant is compared with one-node variants given the same props. Every component has one `Text` child (2 more nodes, included in all figures). 5 runs each, medians, load 0.7 to 1.9.

### Mount, 1,000 components, per component

| Level | Variant | Nodes | Ops | Wire bytes | JS µs | UI thread µs | JS vs (i) | UI vs (i) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 3 props | (i) View by hand | 3 | 10 | 618 | 257 | 174 | | |
| | (i') mapped in Dart | 3 | 10 | 589 | 229 | 151 | −28 | −23 |
| | (ii-a) wrapper, JSX attributes | 3 | 10 | 618 | 301 | 164 | +44 | −10 |
| | (ii-b) wrapper, memo per prop | 3 | 10 | 618 | 337 | 181 | +80 | +7 |
| | (ii-c) wrapper, naive | 3 | 10 | 618 | 339 | 177 | +82 | +3 |
| | (iii) composed, 3 nodes | 5 | 17 | 1,108 | 429 | 250 | **+172** | **+76** |
| 11 props | (i) View by hand | 3 | 14 | 957 | 313 | 238 | | |
| | (i') mapped in Dart | 3 | 17 | 977 | 298 | 236 | −15 | −2 |
| | (ii-a) wrapper, JSX attributes | 3 | 14 | 957 | 304 | 249 | −9 | +11 |
| | (ii-b) wrapper, memo per prop | 3 | 14 | 957 | 416 | 267 | +103 | +29 |
| | (ii-c) wrapper, naive | 3 | 14 | 957 | 402 | 271 | +89 | +33 |
| | (iii) composed, 6 nodes | 8 | 27 | 1,855 | 750 | 401 | **+437** | **+163** |
| 17 props | (i) View by hand | 3 | 17 | 1,222 | 376 | 289 | | |
| | (i') mapped in Dart | 3 | 24 | 1,379 | 345 | 317 | −31 | +28 |
| | (ii-a) wrapper, JSX attributes | 3 | 17 | 1,222 | 361 | 279 | −15 | −10 |
| | (ii-b) wrapper, memo per prop | 3 | 17 | 1,222 | 460 | 316 | +84 | +27 |
| | (ii-c) wrapper, naive | 3 | 17 | 1,222 | 453 | 316 | +77 | +27 |
| | (iii) composed, 12 nodes | 14 | 46 | 3,180 | 1,314 | 575 | **+938** | **+286** |

"UI thread" is decode + apply + build. Run-to-run spread of the one-node variants is about ±40 µs of JS, so differences smaller than that (all of (i') and (ii-a)) are within noise. The 200-component runs give the same picture (for 17 props: 317, 445, 348, 392, 453, 1,258 µs).

**Overhead of (ii) over (i): 0 to about 100 µs of JS per component, no extra ops, no extra bytes, nothing measurable on the UI thread.** The 80 to 100 µs is the cost of creating memos (four in (ii-b), one in (ii-c)); the plain-JSX wrapper has no measurable cost at mount.

**Overhead of (iii) over (i): +172, +437, +938 µs of JS and +76, +163, +286 µs of UI thread per component for 3, 6, 12 nodes.** That is linear: **about 85 µs of JS, 26 to 38 µs of UI thread and about 215 wire bytes per extra node.** JS ratio 1.7x, 2.4x, 3.5x; UI ratio 1.4x, 1.7x, 2.0x.

What that means, on this machine:

| | Extra JS | Extra UI thread | Baseline (i) JS / UI |
|---|---:|---:|---:|
| 200-component screen, wrapper (ii) | 0 to 20 ms | about 0 | 63 to 75 ms / 58 ms |
| 200-component screen, composed 3 / 6 / 12 | 34 / 87 / 188 ms | 15 / 33 / 57 ms | |
| 1,000-row list, wrapper (ii) | 0 to 100 ms | 0 to 30 ms | 376 ms / 289 ms |
| 1,000-row list, composed 3 / 6 / 12 | 172 / 437 / 938 ms | 76 / 163 / 286 ms | |

### Prop update: one signal changes one prop on all 1,000 components, per component

| Level, prop | Variant | setProp ops | Wire bytes | JS µs | Decode µs |
|---|---|---:|---:|---:|---:|
| 17 props, `bg` | (i) View by hand | 2 | 277 | 69 | 32 |
| | (i') mapped in Dart | 1 | 57 | 47 | 8 |
| | (ii-a) wrapper, JSX attributes | 4 | 446 | 105 | 65 |
| | (ii-b) wrapper, memo per prop | 1 | 191 | 78 | 22 |
| | (ii-c) wrapper, naive | 4 | 446 | 177 | 63 |
| | (iii) composed, 12 nodes | 1 | 190 | 62 | 23 |
| 17 props, `opacity` | (i) View by hand | 3 | 335 | 84 | 53 |
| | (i') mapped in Dart | 1 | 58 | 54 | 4 |
| | (ii-a) wrapper, JSX attributes | 5 | 504 | 102 | 88 |
| | (ii-b) wrapper, memo per prop | 1 | 58 | 51 | 6 |
| | (ii-c) wrapper, naive | 5 | 504 | 191 | 96 |
| | (iii) composed, 12 nodes | 1 | 58 | 28 | 5 |
| 3 props, `bg` | (i) / (i') / (ii-a) / (ii-b) / (ii-c) / (iii) | 1 / 1 / 2 / 1 / 2 / 1 | 77 / 57 / 138 / 77 / 138 / 97 | 29 / 25 / 56 / 59 / 100 / 30 | |

Findings:

- **Reactivity is where a naive wrapper costs.** Solid's `spread` runs one effect per element that re-reads every prop getter. Any prop written as an object literal is a new object each time, so it is resent even though nothing in it changed. The naive wrapper resends 4 to 5 props and costs 2.5x the JS of the hand-written `View`. The same is true, to a lesser degree, of the hand-written `View` itself (2 to 3 props resent) and of the existing `View` as shipped.
- The memo-per-prop wrapper sends exactly one op and is as cheap as or cheaper than the hand-written `View` on update, for 80 to 100 µs more at mount.
- **Composed primitives are the cheapest to update** (one small effect on one small node): 28 µs against 84 µs for an opacity change. Their cost is at mount, not at update.
- Mapping in Dart sends the least (one short string, 57 bytes) and is the cheapest one-node variant on update, by 20 to 30 µs per component.
- The floor is high regardless of variant: about 30 to 50 µs of JS per component per changed prop. Changing one prop on 1,000 components is 30 to 80 ms of JS whatever the layer is written in.

### Memory

`engine.memoryUsage()` deltas across a 1,000-component mount, per component: composed 3 / 6 / 12 nodes: 2.4 / 14.8 / 39.5 KB, stable across runs and across 200 and 1,000 components. The one-node variants read between −20 and +16 KB because QuickJS collected garbage between the two samples at different points; they are not usable as a comparison. Memo-per-prop wrapper: +5.3 to 5.5 KB, stable. Process RSS deltas were noise. Treat the memory figures as indicative only.

## 3. Does a busy JS thread hurt interaction?

Three interactions, each implemented twice in `examples/perf_bench/src/interact.tsx`:

| | JS-driven | Dart-owned (declared in JS, executed by Flutter) |
|---|---|---|
| Drag | `<GestureDetector onPanUpdate>` sets a signal, `<View transform>` reads it | `benchDragBox`: pan handled in a Dart `State` |
| Scroll-linked header | `createScrollController().scrollOffset()` drives `<View height>` | `benchShrinkHeader`: listens to the `ScrollController` in Dart |
| Upper-casing text field | `<TextField value onChanged>` with `toUpperCase()` in JS | `benchUpperField`: a `TextInputFormatter` |

Input is synthetic: real `PointerDown/Move/Up` events through `GestureBinding` at about 60 Hz from a Dart timer (not aligned to frames), and `EditableTextState.updateEditingValue` for keys, the call the platform IME makes. The app runs outside the test harness with real frames; a Flutter-owned spinner on every screen keeps a frame scheduled at every vsync. Positions and text are sampled after layout of every frame. Latency is from an input to the end of the first frame (UI thread) that reflects it. JS loads: idle; **periodic** (5 ms busy every 16 ms); **long** (one 200 ms or 1 s busy loop started 600 ms into the interaction). 3 runs of each, load 1.3 to 2.7.

### Drag (100 px/s, 2.4 s)

| JS load | Owner | Latency p50 ms | p95 ms | Worst ms | Worst, frames | Longest freeze of the box ms | Missed vsyncs, worst run | Worst build ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| idle | Dart | 7.6 | 16.2 | 18.6 | 1.1 | 32.7 | 0 | 1.5 |
| idle | JS | 10.1 | 18.0 | 19.5 | 1.2 | 33.8 | 0 | 0.4 |
| periodic | Dart | 6.6 | 15.9 | 18.4 | 1.1 | 33.1 | 0 | 0.3 |
| periodic | JS | 11.1 | 20.5 | 24.0 | 1.4 | 34.6 | 0 | 0.5 |
| long 200 ms | Dart | 6.4 | 15.6 | 17.2 | 1.0 | 19.5 | 0 | 1.0 |
| long 200 ms | JS | 11.0 | 111 | 192 | 11.5 | 218 | 0 | 0.6 |
| long 1 s | Dart | 7.5 | 16.2 | 32.6 | 2.0 | 50.4 | 2 | 0.7 |
| long 1 s | JS | 123 | 923 | 1,005 | 60.3 | 1,033 | 1 | 2.1 |

### Scroll-linked header (60 px/s)

| JS load | Owner | Header lag p50 ms | Worst ms | Worst, frames | Worst header error px | Frames with a stale header |
|---|---|---:|---:|---:|---:|---:|
| idle | Dart | 0.0 | 18.9 | 1.1 | 0.0 | 0 of 127 |
| idle | JS | 12.8 | 36.5 | 2.2 | 1.9 | 96 of 122 |
| periodic | Dart | 0.0 | 15.6 | 0.9 | 0.0 | 0 of 112 |
| periodic | JS | 13.5 | 49.3 | 3.0 | 2.3 | 84 of 116 |
| long 200 ms | Dart | 0.0 | 17.9 | 1.1 | 0.0 | 0 of 117 |
| long 200 ms | JS | 15.0 | 210 | 12.6 | 12.3 | 92 of 122 |
| long 1 s | Dart | 0.0 | 23.7 | 1.4 | 0.0 | 0 of 113 |
| long 1 s | JS | 22.9 | 1,012 | 60.7 | 60.4 | 102 of 119 |

This screen (100 cards, full repaint) rasterises in 12 to 14 ms under llvmpipe, so 21 to 36 vsyncs were missed in every run, Dart-owned and JS-driven alike, idle and loaded alike. That is the software rasteriser, not JS. UI-thread build time stayed under 19 ms in all runs.

The header error scales with scroll speed: one frame behind at 60 px/s is 1 to 2 px; at a 2,000 px/s fling it would be about 33 px per frame of lag. Not measured at that speed.

### Text field

43 keys, one every 80 ms, appended at the end:

| JS load | Owner | Final text correct | Chars lost | Frames showing a lowercase letter (median) | Frames where the text got shorter (worst) | Key to correct text, p50 / worst ms |
|---|---|---:|---:|---:|---:|---:|
| idle | Dart | 3/3 | 0 | 0 | 0 | 6.8 / 17.7 |
| idle | JS | 3/3 | 0 | 2 | 0 | 7.1 / 20.1 |
| periodic | Dart | 3/3 | 0 | 0 | 0 | 5.7 / 18.4 |
| periodic | JS | 3/3 | 0 | 6 | 0 | 6.2 / 23.3 |
| long 200 ms | Dart | 3/3 | 0 | 0 | 0 | 4.8 / 17.8 |
| long 200 ms | JS | 3/3 | 0 | 14 | 0 | 4.9 / 218 |
| long 1 s | Dart | 3/3 | 0 | 0 | 0 | 5.0 / 18.1 |
| long 1 s | JS | 3/3 | 0 | 61 | 1 | 8.1 / 1,018 |

At one key every 30 ms (idle and periodic only) the result was the same: correct, 3 and 7 frames showing lowercase.

6 keys typed in the middle of `HELLO WORLD` (cursor after `HELLO`):

| JS load | Owner | Final text | Correct | Final cursor (want 11) |
|---|---|---|---:|---:|
| idle | Dart | `HELLOABCDEF WORLD` | 3/3 | 11 |
| idle | JS | `HELLOA WORLDBCDEF` | **0/3** | 17 |
| periodic | Dart | `HELLOABCDEF WORLD` | 3/3 | 11 |
| periodic | JS | `HELLOA WORLDBCDEF` | **0/3** | 17 |

The JS-driven field fails with no load: when the upper-cased value comes back, `FuseTextField.didUpdateWidget` replaces the text and puts the cursor at the end, so the next key lands there. Preserving the selection in Dart would fix this case; it would not remove the frames in which the user sees the unformatted text.

Appending did not lose characters even behind a 1 s task. The reason is specific: the queued edits are replayed in a burst, Dart applies only the last value per frame, and `FuseTextField` ignores a value equal to the current text. One run showed the text briefly get shorter.

### The three statements

**(a) "A busy JS thread never drops frames for Flutter-owned work": confirmed, with a correction.**
With JS busy for a full second, the Dart-owned drag had the same latency as idle (p50 7.5 against 7.6 ms), the Dart-owned header was never stale (0 of 113 frames), the Dart-owned text field was unaffected, and UI-thread build time stayed under 2.1 ms on the drag screen. Missed vsyncs in the Dart-owned drag: 0 of 144 in all nine runs under idle, periodic and 200 ms loads; 2, 1 and 0 of 144 in the three runs with the 1 s task. UI-thread build time in those runs was under 0.7 ms, so the UI thread was not what missed them; on this 4-core VM the software rasteriser's threads compete with the spinning JS thread for cores, and an unloaded control run in part 5 also missed 2. So: confirmed to within one or two frames per second-long task, and the residue cannot be attributed with this setup.
The correction: the *output* of JS work does drop frames. The op batch is decoded and built on the UI thread. While a 5,000-node mount landed, the Dart-owned drag froze for 335 ms and the worst frame build was 123 ms (part 5). "Flutter-owned work is immune to JS" is true of JS execution and false of JS results.

**(b) "JS-driven interaction is fine when JS is idle": true for drag, not for the other two.**
Drag: +2.5 ms at the median, worst case within 1.2 frames, the same as Dart-owned. Scroll-linked header: stale in 96 of 122 frames, one frame behind by construction (the offset is only known during the frame). Text: appending shows 2 to 3 frames of lowercase in 43 keys; editing mid-text gives wrong text.

**(c) How bad under load.**
Periodic 5 ms every 16 ms: barely measurable. Drag p50 +1 ms, worst 24 ms (1.4 frames); header worst 49 ms (3 frames).
One long task: the JS-driven interaction freezes for the length of the task, to within a frame: 218 ms behind a 200 ms task, 1,033 ms behind a 1 s task; header 12 px and 60 px off at 60 px/s. Nothing is lost; the queued events are replayed when JS returns.
From part 1, the operations that produce such a task on this machine are a 1,000-node mount (78 ms), a 500-row list replace (196 ms) and a 5,000-node mount (477 ms).

## 4. The bridge

### Awaited round trip

1,000 calls per run, 5 runs, load 0.7 to 1.1.

| Round trip | p50 µs | Min µs | p95 µs |
|---|---:|---:|---:|
| Dart → JS → Dart, awaited one at a time (`channels.call`) | 1,426 | 1,244 | 1,586 |
| Same, `channels.send` (no timeout wrapper, result ignored) | 1,416 | 1,210 | 1,567 |
| Dart → Rust → Dart, no JS run (`engine.memoryUsage()`, takes the runtime lock) | 1,335 | 1,149 | 1,477 |
| UI isolate sends itself a port message and awaits it | 1,107 | 1,022 | 1,183 |
| UI isolate awaits a zero-duration timer | 1,130 | 1,045 | 1,201 |
| JS → Dart → JS, awaited one at a time, timed in JS | 1,333 (mean) | | |
| Dart → JS → Dart, 1,000 issued together and awaited | **45 per call** (mean) | | |

Report 05 could not measure the awaited round trip because the test binding's event loop swamped it. Outside the test binding the same floor appears and it is not the bridge: **on the Flutter Linux embedder the UI isolate needs 1.1 ms just to be woken by a message to itself.** Of the 1.43 ms round trip, 1.11 ms is that wake-up, about 0.23 ms is Dart to Rust and back, and about 0.09 ms is running JS. Issued together, calls cost 45 µs each (22,000 round trips per second).

So the bridge-proper cost of an awaited call is about 0.3 ms here, and the figure a phone will show depends on how quickly its embedder wakes the UI isolate, which was not measured. Timestamps inside Rust were not added; the decomposition above is by subtraction between rows of the same run.

### Op throughput and cost per `setProp` by value type

One batch of N `setProp` ops with a value of the given type; per op, medians of 5 runs.

| Value | Wire bytes | JS emit µs | of which `bridge_call` | Dart decode µs | Dart apply µs | JS done → Dart handler µs | JS ops/s | Dart ops/s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| number | 60 | 7.6 | 5.6 | 6.6 | 0.28 | 16.0 | 132k | 145k |
| bool | 61 | 8.0 | 5.8 | 6.9 | 0.22 | 16.6 | 125k | 140k |
| short string | 68 | 7.6 | 5.5 | 7.3 | 0.24 | 16.3 | 131k | 132k |
| colour string | 65 | 8.5 | 6.4 | 7.2 | 0.33 | 16.8 | 118k | 133k |
| function (callback) | 60 | 7.1 | 5.2 | 6.8 | 0.32 | 16.4 | 140k | 141k |
| padding object, 4 numbers | 98 | 12.6 | 10.2 | 12.9 | 0.21 | 30.5 | 80k | 76k |
| decoration, nested, 16 leaves | 400 | 40.7 | 38.6 | 48.9 | 0.28 | 126 | 25k | 20k |
| array of 100 numbers | 457 | 49.3 | 11.3 | 59.7 | 1.83 | 166 | 20k | 16k |
| 1 KB string | 1,061 | 9.7 | 7.5 | 7.9 | 0.37 | 26.3 | 103k | 121k |

- A primitive `setProp` costs about 8 µs to emit and about 7 µs to decode. Both are dominated by converting the op object (`{op, id, name, value}`) across the bridge, not by the value.
- Cost follows the number of leaves, not bytes: a 1 KB string costs the same as a number; a 16-leaf decoration costs 5 to 7 times as much.
- Applying an op in Dart is 0.2 to 0.3 µs. The Dart-side cost is decoding, and it runs on the UI isolate.
- In frame terms: JS can emit about 2,000 primitive ops per 16.7 ms and Dart can decode about 2,300, before any widget is built.
- A full mount (create + props + insert) runs at about 39,000 ops/s in JS (5,000-node row of part 1), because creating nodes and running effects costs more than emitting the op.

### The same batch as one JSON string

Not asked for, but it follows directly from the table: the 5,000-node mount batch (18,620 ops), sent again as `JSON.stringify(ops)` in one string and `jsonDecode`d in Dart. 5 runs, load 0.7.

| Step | Structured value (today) | One JSON string |
|---|---:|---:|
| JS: produce and hand to the bridge | 129 ms (`bridge_call`) | 44.2 + 1.6 ms (stringify + `bridge_call`) |
| Dart: decode on the UI isolate | 144 ms | 34.3 ms (`jsonDecode`); longest UI stall 36.8 ms |
| JS done → Dart has the ops | 344 ms | about 100 ms (whole round trip, including the reply) |

For the 1,000-node batch: 29.6 → 7.8 ms in JS, 24.0 → 4.7 ms decode, 63 → about 25 ms transit. This would take roughly 85 ms off the 477 ms JS task and 110 ms off the 316 ms of UI-thread time for a 5,000-node mount. It was measured as a re-send of a captured batch, not implemented in the renderer.

## 5. Mitigations

### Chunking a 5,000-node mount

454 cards (4,994 nodes) mounted behind a box that is being dragged; the mount starts 600 ms into the drag. "Chunk N" appends N cards, flushes, then yields with `setTimeout(0)`. "Paced N" yields until Dart reports that a frame has been drawn. 3 runs, load 1.2 to 3.4.

| Mount | Drag owner | Mount wall ms | Mount JS ms (sum) | Longest JS slice ms | Drag latency p95 ms | Worst ms | Longest freeze of the box ms | Worst build ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| none | Dart | | | | 15.8 | 35.0 | 38.0 | 0.5 |
| none | JS | | | | 18.0 | 21.9 | 22.7 | 0.5 |
| all at once | Dart | 451 | 451 | 451 | 17.8 | 160 | **335** | 123 |
| all at once | JS | 437 | 437 | 437 | 393 | 530 | **955** | 124 |
| chunk 60, `setTimeout(0)` | Dart | 406 | 380 | 86.5 | 17.8 | 188 | 250 | 77.3 |
| chunk 60, `setTimeout(0)` | JS | 471 | 443 | 86.1 | 115 | 378 | 798 | 70.1 |
| chunk 20, `setTimeout(0)` | Dart | 448 | 442 | 49.7 | 18.1 | 115 | 128 | 45.5 |
| chunk 20, `setTimeout(0)` | JS | 391 | 383 | 60.1 | 23.4 | 290 | 711 | 78.4 |
| chunk 5, `setTimeout(0)` | Dart | 465 | 462 | 41.9 | 16.7 | 126 | 135 | 61.6 |
| chunk 5, `setTimeout(0)` | JS | 434 | 430 | 48.2 | 23.6 | 324 | 750 | 61.6 |
| paced 20 (one slice per frame) | Dart | 1,503 | 478 | 54.8 | 26.8 | 51.7 | **70.8** | 21.9 |
| paced 20 | JS | 1,546 | 478 | 57.6 | 53.4 | 117 | **123** | 24.0 |
| paced 5 | Dart | 3,956 | 591 | 41.9 | 35.9 | 57.3 | 66.2 | 17.4 |
| paced 5 | JS | 4,239 | 596 | 45.2 | 64.0 | 89.1 | 95.7 | 23.6 |

- **Yielding with `setTimeout(0)` does not keep input responsive.** It costs nothing in total time, and it does free the JS thread between slices, but the JS-driven box still froze for 711 to 798 ms. JS produces slices faster than Flutter can show them; the UI thread, which also has to deliver the pointer events and apply the replies, becomes the queue.
- **Pacing slices to frames works**: the freeze drops from 955 ms to 123 ms (JS-driven) and from 335 ms to 71 ms (Dart-owned). The price is wall time: 3.4x for 20 cards per frame, 9x for 5.
- The longest slice was 42 to 58 ms even for 5 cards (55 nodes), ten times the average slice. It was not investigated; garbage collection and the growing list reconcile are candidates.
- Frame build stays at 17 to 24 ms even when paced, because each slice repaints the whole unvirtualised list. A lazy list would change this more than chunking does.

### JSON parsing on a second engine

A second engine (`createEngine()`), given the JSON text from Dart. 3 runs, load 2.7 to 2.9, `min / median / max` ms.

| | 100 KB | 1 MB |
|---|---:|---:|
| Parse on the main engine: main JS busy | 2.3 / **2.7** / 2.7 | 25.3 / **28.2** / 132 |
| Parse on the worker, alone | 2.1 / **2.1** / 2.3 | 21.1 / **25.6** / 34.2 |
| Parse on the worker while the main engine is busy-looping | 2.3 / **2.3** / 3.4 | 20.8 / **33.6** / 35.9 |
| Worker parses, whole value moved to the main engine: total | 33.3 / **33.9** / 47.4 | 255 / **317** / 335 |
| of which worker parse + return to Dart | 17.1 | 188 |
| of which hand-over to the main engine | 18.3 | 128 |
| longest UI-isolate stall receiving it / synchronous encode on the UI thread sending it | 5.8 / 7.0 | 70.2 / 64.9 |
| Worker parses and reduces to 50 small records, those are moved: total | 11.8 / **13.1** / 15.2 | 44.7 / **74.5** / 74.5 |
| of which hand-over to the main engine | 2.0 | 2.4 |
| Handing the 1 MB text to an engine from Dart (no parse) | 3.6 | 15.2 |

- **Two engines do run side by side.** The worker's parse time is the same whether or not the main engine is spinning. This is the first measurement of N = 2 engines actually running (see `notes/multi-engine.md`); only this one scenario was exercised.
- **Moving the parsed value across costs ten times what the parse saved.** For 1 MB it blocks the UI thread twice (70 ms decoding the value from the worker, 65 ms encoding it for the main engine) and the main engine still has to materialise it. Parsing on the main engine blocks JS for 28 ms and the UI thread not at all.
- A second engine pays off only when the work is expensive and the result is small: parse plus reduce moved the main engine's cost from 28 ms to 2.4 ms.
- Given that a 1 MB parse is two frames, a second engine is not worth building for JSON alone.

## Where the curated layer should live

**In TS, as thin wrappers over fat Dart primitives, one native node per curated component.**

The numbers behind that:

1. Prop reshaping in TS costs 0 to 100 µs of JS per component at mount against a baseline of 260 to 380 µs, adds no ops and no UI-thread time. Doing it in Dart instead saves about 30 µs per component, which is inside the run-to-run noise. For a 200-component screen the choice is worth at most 20 ms of JS; for a 1,000-row list at most 100 ms on top of 376 ms.
2. What a TS layer must not do is multiply nodes. Composition from generated primitives costs about 85 µs of JS and 30 µs of UI thread per extra node. That cost is paid on both threads, so it also slows Flutter-owned work, and it does not go away by making JS faster.
3. The wrapper has to be written with reactivity in mind, and the framework should make that the default: composite props (padding, decoration, flex) behind a memo each, so a change to one input sends one op. Written that way the wrapper is cheaper on update than today's hand-written `View` usage. Written naively it resends 4 to 5 props per change and costs 2.5x.

So the working assumption is half right. "Interactive things belong in Dart" is supported: a JS-driven interaction freezes for the length of the longest JS task, such tasks reach 100 to 500 ms at realistic sizes, and the text field is wrong even at idle. "Translation and wrapper layers belong in Dart because the JS thread gets busy" is **not** supported: the translation is not what makes the JS thread busy. Creating nodes, running effects and marshalling ops is, and that cost is the same whichever language holds the mapping.

Where the recommendation flips:

| Situation | Then |
|---|---|
| The curated component needs more than one native node | Add or extend a Dart primitive rather than composing in TS, as soon as extra nodes x instances on a screen exceeds about 200 (one frame of extra JS here; about 50 on a phone four times slower). A 3-node composition used 20 times is fine. Used as a list row, it is not |
| The wrapper needs many derived values | Each memo costs about 20 to 25 µs at mount. Past roughly 10 memos per instance the wrapper costs as much as two or three extra nodes; map in Dart instead |
| A prop changes at input rate (drag, scroll, typing, animation) | That behaviour goes in Dart regardless of everything above |
| A prop changes on hundreds of instances at once | Send the short friendly value and map in Dart: 57 bytes and 47 µs against 191 bytes and 78 µs per instance per change |
| The component appears a handful of times per screen | Nothing here matters. Compose freely, 12 nodes included: 10 instances cost 9 ms extra |

Things that would move the numbers more than where the layer lives, in order of measured size:

1. **The op transport.** One JSON string instead of a structured value: about −85 ms of JS and −110 ms of UI thread on a 5,000-node mount; similar proportions at 1,000.
2. **A virtualised list.** Every list number in this report builds every row. A 1,000-row list would mount 15 rows.
3. **Pacing large mounts to frames** when input must stay live: freeze 955 → 123 ms, at 3.4x the wall time.
4. **Not resending unchanged object props** from `spread` (compare by value, or memoise in the wrappers): 2 to 5 ops per change become 1.

## What a phone would likely change

Nothing here was measured on a phone. A mid-range phone is commonly several times slower per core than this machine for interpreter-style code; the JS column should be multiplied accordingly, and the Dart columns by a similar but not identical factor. Stated as expectations, not results:

- **Thresholds move down by that factor.** At 4x: one frame of JS at about 50 nodes mounted instead of 200; 100 ms at about 300 nodes instead of 1,300; a 1,000-node mount about 300 ms of JS and 250 ms of UI thread; a 500-row list replace about 0.8 s. At 120 Hz the frame budget halves again.
- **Ratios should hold**: per extra node versus per component, wrapper versus hand-written, JS share versus UI-thread share. They come from op counts and node counts, which do not depend on the device. The split between JS and UI thread could shift if the phone's interpreter speed and Dart AOT speed scale differently.
- **The 1.1 ms wake-up of the UI isolate is a property of the Linux embedder** and will be different. The bridge-proper part (about 0.3 ms per awaited call here) scales with the CPU.
- **Rasterisation moves to a GPU.** The missed vsyncs on the scroll screen here are llvmpipe. On a phone the raster thread has its own budget and was not exercised.
- **Input delivery differs.** On Android and iOS the engine hands pointer events to the framework at the start of a frame. A Dart-owned response then lands in the same frame and a JS-driven one cannot, so the JS-driven drag would likely show a full extra frame rather than the +2.5 ms measured here with unaligned input. Not measured.
- **Fewer fast cores.** Here JS, the UI thread and the rasteriser each had a core. On a phone with two or four fast cores plus slow ones, the JS threads may land on slow cores (fjs raises their priority; not verified on a device) and thermal throttling applies to long tasks.
- **Memory pressure and GC pauses** in QuickJS were not characterised; the unexplained 40 to 60 ms slices in part 5 may be that.

## What could not be measured or was not

- Any device, iOS, Android, macOS, web. Any GPU rasterisation. Profile and debug builds.
- Rasterisation cost in a meaningful way (software renderer).
- The awaited round trip with timestamps inside Rust. The split is by subtraction and is contaminated by the embedder's 1.1 ms wake-up.
- About 200 ms of the 344 ms between JS finishing and Dart receiving a 5,000-node batch: it is after `bridge_call` returns and before the UI isolate starts decoding. Whether the JS runtime lock is held during it was not established.
- "Dart decode" is inferred from an event-loop heartbeat, not timed inside the generated bridge code; resolution about 1 ms, unreliable under 5 ms.
- Memory per component for the one-node variants (GC noise), and peak memory.
- Scroll-linked error at fling speeds; pinch, long-press, or multi-pointer gestures.
- Text input through a real IME, composing regions, autocorrect, selection handles. Keys were injected at the `updateEditingValue` level with the cursor where Flutter last put it.
- Whether the measured costs hold with the recursive prop encoding of report 05 (this branch is cut before it) or with the dev-server connection.
- A virtualised list, the JSON-string transport inside the renderer, and by-value comparison in `spread`: recommended above from measurements of what they would avoid, not implemented.
- Only 3 runs for parts 3 and 5 and 5 runs for parts 2 and 4; worst cases are the worst of few samples.
- The keyed-reorder fix has no unit test and its interaction with handle and slot-node disposal across batches was not examined.
