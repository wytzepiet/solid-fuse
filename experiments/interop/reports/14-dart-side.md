# Report 14: the Dart side of the frame (spike/dartside)

## Summary

The lean render path works and passes its parity tests, but the gain is in build time only. Text layout, which is Flutter's own cost and the largest part of a mount frame, is unchanged.

- **What was built:** `view` is now one render object and one element, `text` is a `RenderParagraph` under one element, prop changes go straight to the render object without a widget build, template constants are parsed once, `transform` and fractional `opacity` update only a layer, and long child lists are edited in blocks. Every part has a switch in `FuseLean`.
- **Mount:** build time for 1,000 nodes went from 7.4 to 4.6 ms and for 5,000 nodes from 54 to 31 ms (medians of 18, semantics off). Elements per 1,000-node screen dropped from 2,989 to 890; plain Flutter has 1,488.
- **Keyed reorders:** the UI-thread cost of a 2,000-row sort went from 38 to 23 ms, entirely from the block list editor.
- **JS-driven animation:** it was already cheap on the UI thread, with no frame over 16.7 ms attributable to either path. The real gain is when the animated nodes share a repaint boundary with a large screen: 2.0 to 0.24 ms per frame for one transformed node.
- **"Rest of frame":** this is the semantics tree. The Linux embedder always turns semantics on; Android and iOS only do so with an assistive service running.
- **One regression is unexplained:** with box and text together, layout in `list_replace_500` is about 10 ms slower in release, which cancels the build gain for that case. This needs resolving before landing.
- **Noise:** the machine drifted about 20% during the afternoon, so the final numbers come from interleaved rounds. Differences under about 10% between variants are not resolved.

**Not done:** the `examples/demo` build and screenshot comparison, the `tpl` suite (lazy list) on the lean path, chunked first mount (discussed only), the text `MediaQuery` lookup optimisation, and allocation volume per 1,000 nodes (only retained heap was measurable).

**Tests:** `apply_ops_test`, `node_widget_test`, `box_parity_test`, `lean_path_test`, `color_parsing_test`, `renderer.test.ts` and the three CLI test files pass, run per file. List-order checks passed 120 of 120 in every variant. Nothing was pushed.

**Commits on `spike/dartside`:** ebdff2e, 285a230, 2f9512c, 7643956, eeadde4, f3990d5, 979ef0a.

## Result table

Release build, semantics off (phone default), medians of 18 reps (6 interleaved rounds of 3), load average 0.5 to 1.3. "Before" is the branch head with templates on (`00-base`); "after" is `FUSE_LEAN=all`. UI is applyOps plus the whole frame on the UI thread, in ms.

| Record | UI before | UI after | Build before | Build after | Layout before | Layout after | Paint before | Paint after | e2e before | e2e after |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mount_1000 | 26.2 (18.9–32.2) | 20.8 (15.3–26.1) | 7.35 | 4.62 | 13.8 | 12.0 | 2.2 | 2.2 | 42.7 | 36.9 |
| mount_5000 | 137 (102–176) | 118 (84–145) | 53.7 | 31.4 | 70.1 | 70.3 | 9.7 | 11.6 | 165 | 149 |
| update_t1 | 5.0 | 5.1 | 0.09 | 0.07 | 0.51 | 0.58 | 4.1 | 4.2 | 21.9 | 22.3 |
| update_t1000 | 59.7 | 59.6 | 17.4 | 13.3 | 34.5 | 39.7 | 4.9 | 5.6 | 90.4 | 91.6 |
| update_c1000 | 9.8 | 8.5 | 4.92 | 2.14 | 0 | 0 | 4.1 | 5.6 | 42.7 | 41.2 |
| list_replace_500 | 67.4 (51–101) | 74.2 (48–100) | 16.5 | 12.7 | 31.0 | 47.7 | 3.4 | 4.2 | 106 | 111 |
| list_sort_2000 | 37.5 | 23.3 | 5.8 | 5.7 | 0.7 | 0.9 | 13.3 | 14.3 | 111 | 103 |
| list_reverse_2000 | 47.7 | 26.0 | 6.7 | 6.4 | 0.7 | 0.9 | 13.8 | 15.5 | 145 | 125 |
| list_filter_2000→1000 | 64.7 | 46.9 | 16.9 | 10.2 | 0.5 | 0.5 | 9.5 | 9.0 | 97.8 | 86.2 |

- **Semantics on (Linux default), UI median before → after:** mount_1000 44.3 → 35.5, mount_5000 216 → 146, update_c1000 10.2 → 8.1, list_replace_500 107 → 94, list_sort_2000 101 → 86.
- **Counts for mount_1000 (1,002 nodes):** elements 2,989 → 890 and render objects 1,164 → 709; plain Flutter has 1,488 and 1,083.
- **Retained Dart heap per mount_1000 (profile build, after full GC):** 4.70 MB / 69,600 objects before, 3.01 MB / 46,100 after; plain Flutter 3.69 MB / 54,900.

## Frame attribution

**Phases (release, measured with a `BenchBinding` that times each pipeline step).** For baseline mount_1000 with semantics off: build 7.4 ms, layout 13.8, paint 2.2, compositing 0.1, finalize 0.01. An idle frame costs 0.12 ms.

**The "rest of frame" is `flushSemantics`.** With semantics on it costs about 8 ms for mount_1000, 60 ms for mount_5000 and 65 ms for a 2,000-row sort. When semantics is enabled, per platform (read from the engine source in `/opt/flutter`):
- **Linux:** always. `fl_engine.cc:932` calls `UpdateSemanticsEnabled(TRUE)` at start.
- **Android:** when `AccessibilityManager` reports enabled (`AccessibilityBridge.java`, `onAccessibilityStateChanged`).
- **iOS:** when VoiceOver, Switch Control or Speak Screen is running (`FlutterViewController.mm:1744`).
- Not verified on a device.

**Finalize** is the unmount of removed elements: 10 ms for list_replace_500 and 22 ms for the filter.

**Layout is text (profile build, CPU samples, 10 ops).**
- In mount_1000, `RenderParagraph.performLayout` is 8.0 of 8.8 ms of layout (about 91%), and `TextPainter.layout` is 49–56% of the whole frame.
- Native shaping and line breaking (`_NativeParagraph._layout`) is 4.9 ms; building the paragraph (builder constructor, `pushStyle`, `build`) is about 1.9 ms.
- Ablation in release: the same cards cost 11.4 ms of layout with text and 0.4 ms without; 364 bare paragraphs cost 8–11 ms.

**Updates.** A one-node colour change repaints the whole repaint boundary: about 4 ms for 3,000 render objects, the same in plain Flutter (4.1–5.5 ms).

**By type in build (baseline, mount_1000):** 641 `FuseNodeWidget`, 364 `Text` plus 364 `FuseText`, and 275 `FuseViewWidget` elements over 1,164 render objects.

## Per idea

Effects are median build ms, semantics off, from the interleaved rounds. The chain is cumulative; "alone" is the switch by itself.

| Idea | Effect | Size | Risk | Landable | Proper or hacky |
|---|---|---|---|---|---|
| (a) Inline builders (`i`) | None measurable: mount_1000 7.2 → 7.1 | ~30 lines | A widget reading `context.widget` breaks; opt-out is `FuseNoInline` | Not worth it alone | Slightly hacky |
| (a) Direct sink instead of listener (`s`) | None measurable; `addListener` was 0.08 ms per 1,000 nodes | ~40 lines | Low | Only as a base for b and t | Proper |
| (b) Merged box (`b`) | Alone: mount_1000 7.2 → 5.6, update_c1000 4.9 → 2.3 | ~600 lines | Medium: reimplements nine Flutter widgets | Yes, behind the switch | Proper |
| (c) Text leaf, updates skip build (`t`) | Alone: mount_5000 55 → 39, update_t1000 16 → 13.4 | ~250 lines | Medium: must track `Text`'s inherited inputs | After the layout regression is understood | Proper |
| (d) Parse once per template (`p`) | In chain: list_replace_500 17.4 → 12.1; alone, none | ~120 lines | Low | Yes | Proper |
| (c) Layer-only transform and opacity (`l`) | Nothing on these records; see animation | ~80 lines | Medium: one layer per animated box | Yes | Proper |
| (g) Block list editor (`e`) | Alone: sort applyOps 15–26 → 2–3 ms | ~90 lines | Low; random-batch test against a list model | Yes, independent of the rest | Proper |
| (f) Lazy `ScrollView` keeps moved rows | Not measured in the bench | ~40 lines | Low | Yes | Proper |

- **(b) parity:** tested against `view.dart` on rectangles, hit testing and pixels, over hand-picked cases, 360 random trees and 60 random update sequences. Two deliberate differences: a `view` keeps its only child mounted when a second child arrives, and the debug overflow marker differs.
- **(c) left out:** the mouse text cursor inside a `SelectionArea`.
- **(e) text:** paragraph layout dominates and nothing in it is safe to cut from the framework. The one remaining framework cost is about 0.35 ms per 364 texts in `MediaQuery` lookups (estimated from the profile, not prototyped).
- **(f) lazy list:** `findChildIndexCallback` is implemented and tested for with and without `gap`. Landing still needs a decision on scroll-extent estimation for variable row heights and on `ensureVisible` for rows not yet built.
- **(f) chunked first mount:** not prototyped. Applying part of a batch per frame would show half-built screens, and the only place that is invisible is off-screen rows, which is what the lazy list already does.
- **What did not matter:** listener cost, the extra component element per node, and applyOps for mounts (0.6 ms per 1,000 nodes).
- **Not addressed:** the JS mirror has the same quadratic list shifting on reorders.

## What remains against plain Flutter

Plain `NativeScreen(91)`, same screen, semantics off: UI 17.7 ms (build 3.8–4.3, layout 11.4–11.7, paint 1.8–1.9).

- **Build:** the lean path is at 4.6 ms median, so the overhead went from about 3.4 µs per node to about 0.5 µs per node, plus 0.6 µs per node for applyOps. The lower quartile (3.3 ms) is below plain Flutter because the lean tree has fewer elements.
- **Layout and paint:** equal to plain Flutter within noise. They are the irreducible part, about 75% of the mount frame, nearly all text.
- **Reorders:** plain Flutter spends 33–43 ms in build for a 2,000-row keyed reorder; the framework spends 6.

## JS-driven animation

180 frames per case, first five dropped, two reps, release. "Work" is applyOps plus the frame on the UI thread, shown as median / p95 in ms, at vsync pacing with semantics off.

| Case | N | Before | After |
|---|---:|---:|---:|
| Transform, empty screen | 1 | 0.23 / 0.28 | 0.21 / 0.29 |
| Transform, empty screen | 20 | 0.40 / 0.56 | 0.38 / 0.48 |
| Transform, empty screen | 200 | 1.63 / 2.46 | 1.77 / 2.50 |
| Colour | 200 | 1.46 / 2.09 | 1.06 / 1.40 |
| Size | 200 | 1.31 / 1.94 | 1.25 / 1.49 |
| Transform over a 1,000-node screen | 1 | 1.98 / 2.79 | 0.24 / 0.29 |
| Transform over a 1,000-node screen | 20 | 2.13 / 3.06 | 0.41 / 0.52 |
| Transform over a 1,000-node screen | 200 | 4.22 / 6.17 | 1.75 / 2.30 |
| Size over a 1,000-node screen | 200 | 3.64 / 4.98 | 3.10 / 5.10 |

- **8 ms timer (120 Hz-style), N = 200 transform:** 2.09 / 2.84 before, 1.92 / 2.94 after.
- **Over-budget frames, semantics off:** no case had a frame over 16.7 ms except one 20 ms outlier before. Frames over 8.3 ms were 0–4 of 352 in both paths.
- **Semantics on, over a 1,000-node screen, N = 200:** transform 5.65 → 2.46 ms (frames over 8.3 ms: 20 → 1 of 352); size 7.05 → 4.38 ms (101 → 3).
- **Skipping build:** after the change, the animated nodes run no widget build. The remaining "build" phase (0.5 ms for 200 nodes, about 2.5 µs per node) is the dirty-element flush writing to the render object. Transform and opacity run no layout or paint; colour still paints and size still lays out.
- **Fixed frame cost:** about 0.2 ms.
- **The JS side is now the larger cost:** 3.2–4.0 ms per step for 200 nodes on the JS thread, against under 2 ms on the UI thread.
- **Skipped vsyncs** were counted but are non-zero in both paths (66–167 with the backdrop) and reflect the software rasteriser, not the UI thread.

## Limits

- No phone was used. Everything ran on Linux x64, 4 vCPU, under xvfb with software raster.
- A GPU would change paint and raster numbers and the skipped-vsync counts. Build, layout, applyOps and semantics are CPU work and should carry over in proportion, not in absolute value.
- Profile-mode numbers are for proportions only.
- The `list_replace_500` layout regression (31 → 48 ms median, only with `b` and `t` together) shows up inside native paragraph layout in the profile (+2.3 ms there). The engine's paragraph cache is a suspect, but that is a guess.
- Early runs before interleaving are kept under `results/r14/early/` and are not quoted in the tables.

## Rerun

```
cd /home/claude/wt/dartside/examples/perf_bench
export PATH=/opt/flutter/bin:$PATH BUILDS=/home/claude/wt/dartside-builds LOADMAX=1.3
FUSE_TEMPLATES=1 bun fuse build --js-only && (cd dart && flutter build linux --release --no-tree-shake-icons)
FUSE_LEAN=all tools/r14-run.sh core 3 -r1 0 03-lean        # <suite> <reps> <tag> <sem> <build>
python3 tools/r14-chain.py -b 03-lean 0 buildMs base none i is isb isbt isbtp isbtpl all b t p e   # add -r or -q
python3 tools/r14-prof.py /tmp/prof3-all fuse_mount_1000 --top 30
```

Suites are `core`, `fa` (attribution and plain Flutter), `anim` and `prof` (use `MODE=profile PROF_OUT=dir` with `03-lean-profile`). Dart tests run per file with `flutter test test/<name>_test.dart` in `packages/solid-fuse/dart`.

Files are in `/home/claude/wt/dartside`:
- `packages/solid-fuse/dart/lib/src/lean.dart`
- `packages/solid-fuse/dart/lib/src/widgets/box.dart`
- `packages/solid-fuse/dart/lib/src/widgets/text_leaf.dart`
- `packages/solid-fuse/dart/lib/src/widgets/scroll_view.dart`
- `packages/solid-fuse/dart/test/box_parity_test.dart`
- `packages/solid-fuse/dart/test/lean_path_test.dart`
- `packages/docs/content/docs/architecture.mdx`
- `examples/perf_bench/results/r14/`
- `examples/perf_bench/tools/r14-chain.py`
