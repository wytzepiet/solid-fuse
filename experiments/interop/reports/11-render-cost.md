# 11. Where the render cost goes, and what removing it buys

Branch `spike/perf` (worktree `wt/perf`), commits after `a1243dd`. Benchmark app: `examples/perf_bench` (see its README and report 10). All quoted numbers are release builds on Linux desktop x64, 4 cores, QuickJS thread plus Flutter UI thread, software raster under xvfb. Every record carries the 1-minute load average; it was 0.4 to 1.4 throughout (the machine is not silent, so ranges are wide and differences under about 10% between two builds are not resolved). Medians of at least 7 repetitions, range in brackets.

## Result

Baseline is the branch before this work (engine at opt-level "z"). "Now" is the branch head. Milliseconds, median (min to max).

| Operation | JS task before | now | UI thread before | now | End to end before | now |
|---|---:|---:|---:|---:|---:|---:|
| mount 200 nodes | 16.5 (13.2–23.7) | 3.0 (2.7–4.8) | 17.2 (12.7–35.9) | 10.8 (7.5–20.5) | 56.5 (39.9–78.5) | 24.5 (24.2–37.2) |
| mount 1,000 nodes | 85.5 (69.8–121) | 14.2 (12.0–17.1) | 59.7 (54.0–71.2) | 40.2 (33.8–51.5) | 196 (162–249) | 71.0 (65.0–84.8) |
| mount 5,000 nodes | 457 (375–642) | 101 (89–144) | 309 (261–349) | 208 (176–242) | 964 (881–1190) | 329 (281–394) |
| list replace 500 rows | 203 (169–327) | 43.8 (35.0–63.2) | 162 (137–258) | 110 (85–138) | 459 (386–612) | 172 (139–215) |
| one signal, 1 text node | 0.19 | 0.15 | 13.8 | 15.2 | 27.0 | 28.2 |
| one signal, 50 text nodes | 1.43 | 1.11 | 15.8 | 16.6 | 30.0 | 31.5 |
| one signal, 1,000 text nodes | 22.4 (17.3–70) | 14.6 (9.9–19.7) | 81.8 (68–105) | 87.3 (67–123) | 124 (99–194) | 114 (92–154) |
| one signal, 1,000 colours | 28.6 (23.3–54) | 16.1 (10.9–21.0) | 24.2 (13.3–58.6) | 12.9 (9.5–16.3) | 75.6 (58–127) | 45.7 (26–50) |
| sort 2,000 keyed rows | 88.4 (81–115) | 48.8 (45–75) | 123 (111–180) | 90.4 (86–129) | 265 (225–319) | 165 (145–221) |

n = 14 before (two runs of 7), 7 now (14 for the operations the suite runs twice). List-order checks (Dart tree against the JS array after replace, sort, shuffle, reverse, filter): 40 of 40 pass in every build of every run.

"JS task" is uninterrupted time on the JS thread. "UI thread" is decode + `applyOps` + the frame (build, layout, paint) that shows the change. End to end is command sent to that frame finished on the UI thread.

Two prototypes that are not in the table above, because they need the app to opt in:

| 500-row list (2,500 nodes) | JS | UI frame | End to end |
|---|---:|---:|---:|
| mount, ordinary rows | 33.9 (26.5–54.2) | 90.0 (72–103) | 141 (123–157) |
| mount, rows from the template op | 3.5 (3.1–5.2) | 78.0 (72–90) | 94.6 (89–106) |
| mount, lazy ScrollView | 38.8 (27–54) | 8.2 (7.8–18.9) | 60.2 (58–86) |
| replace, ordinary rows | 39.3 (30–74) | 104 (85–126) | 159 (134–193) |
| replace, rows from the template op | 6.8 (5.7–14.5) | 100 (83–138) | 127 (110–172) |
| replace, lazy ScrollView | 41.8 (34–63) | 9.2 (8.5–15.7) | 75.9 (58–91) |

The two are independent (one removes JS, the other removes Flutter build and layout of off-screen rows); together a 500-row replace would be near 7 ms JS and 9 ms frame. That combination was not run.

## Part A. Attribution at the start

Scenario: mount of 91 cards = 1,001 nodes (273 views, 364 text elements, 364 text leaves), 3,737 ops, 240 KB as JSON. Baseline build.

### JS thread: 75 to 85 ms, 75 to 85 µs per node

Measured with ablation variants of the same screen in a Rust harness that runs the real engine and the real `fjs.bridge_call` conversion without Flutter (`libfjs/src/tests/bench_harness.rs`, `src/abl.tsx`), cross-checked with `perf` (cpu-clock, dwarf call graphs) on the release library. Harness figures, opt-level z; they add up to the 81 ms the same harness measures for the whole mount.

| Part | ms | µs per node | How measured |
|---|---:|---:|---|
| `fjs.bridge_call`: converting the op array to Rust values (`JsValue::from_js`) | 29 | 29 | timer around the call; `perf`: 33.6% inclusive |
| of which: one TypeError created and discarded per plain object | about 22 | 22 | `perf`: `JS_ThrowTypeError` + `build_backtrace` 25.3% of the whole JS thread |
| Built-in wrapper components: `View`/`Text` are `(props) => <view {...props}/>`; Solid's universal `spread` makes 3 render effects per element | 32 | 51 per element | `card_for` minus `card_intrinsic`; micro: `View4` 79.5 µs against the same element as an intrinsic 12.3 µs |
| Reactive bindings the screen really has (dynamic props and text) | 10 | | `card_intrinsic` minus `card_static` |
| Emitting nodes and ops for a static tree | 11.7 | 11.7 | `raw` variant |
| of which: `FuseNode` constructor (class fields compiled to `_defineProperty` calls at es2020) | 4.5 | 4.3 against 0.97 per node | replica with a plain constructor; micro `node_fields` against `node_plain` |
| of which: one object per op | 4 | | replica with a flat array |
| of which: prop bookkeeping, flush scheduling | 3.1 | | replica switches |
| Cycle GC inside the above (6 full-heap marks while the tree grows) | about 7 | | harness with the collector off; `perf`: `JS_RunGC` 8.4% |

After `bridge_call` returns, the JS thread spends another 8.4 ms turning the Rust values into a `DartCObject` tree and 6.5 ms freeing it (49 and 61 ms at 5,000 nodes). That is not in "JS task" but it delays the message and the next JS task.

Things tested that changed nothing at run time: precompiled bytecode (saves the 12.5 ms compile at startup, no difference per mount), a minified bundle (72 KB against 133 KB), and the compiler output for intrinsic elements, which is already direct (`setProp` calls for static props, one effect per dynamic prop).

Reference costs in QuickJS (µs, opt-level z): object literal with 4 fields 0.57, closure 0.59, signal 3.5, memo 9.8, render effect 10.4 to 13.2, `createComponent` 0.69, `mergeProps` 7.9 to 12.2, reading 4 props through the merge proxy 5.4 against 0.13 plain, dynamic text insert 37.9 against 18.6 static.

### Crossing: about 58 ms between the end of the JS task and the start of `applyOps`

The op batch was materialised six times: JS objects, Rust `JsValue` tree (`from_js`), `DartCObject` tree (`into_dart`; the callback uses the DCO codec, not SSE), Dart VM message objects (deserialised on the UI isolate), frb's Dart `JsValue` classes (`dco_decode_js_value`), plain Dart maps and lists (`.value`), and then `Map.from` copies in `applyOps` and `FuseMap`.

| Step | Thread | ms per 1,000 nodes |
|---|---|---:|
| `from_js` | JS | 25 to 30 |
| `into_dart` | JS | 8.4 |
| free the Rust tree | JS | 6.5 |
| VM message deserialisation | UI | about 7 (by subtraction) |
| `dco_decode_js_value` | UI | about 4 |
| `.value` to plain Dart | UI | 12.7 |
| typed map copies | UI | 0.5 |
| for comparison: `jsonDecode` of the same batch as one string | UI | 3.8 |

### Dart UI thread: 60 ms

| Part | ms | Whose |
|---|---:|---|
| decode (the three UI rows above) | 24 to 30 | ours (bridge format) |
| `applyOps` | 1.1 to 1.5 | ours |
| frame: build | 9.7 | Flutter's, except 1.5 ms inside our `build` methods (0.29 node widget, 1.18 `View`/`Text`) |
| frame: layout | 13.1 | Flutter's |
| frame: paint | 1.5 | Flutter's |
| frame: rest (compositing, semantics, post-frame) | 4.9 | Flutter's |

The same UI written directly in Flutter (`NativeScreen`, same widgets): build 4.5, layout 13.4, paint 2.0. Fuse created 3,395 elements for 1,107 render objects (5.3 elements per node); plain Flutter 1,485 for 1,083. At 5,000 nodes: Fuse build 40.8, layout 65.7, paint 7.8; plain Flutter 29.2, 69.5, 7.4.

### What contradicted the assumptions

1. The frame cost is Flutter's own. Our widget code is 1.5 ms of a 29 ms frame, and plain Flutter pays the same layout. "Fewer wrapper widgets" and "typed props decoded once" could never have been large; the Dart cost that was ours was the decode.
2. The largest single JS cost was not JS: a thrown and discarded exception per plain object inside fjs (`ArrayBuffer::from_object` calls `JS_GetArrayBuffer`, which throws for anything that is not an ArrayBuffer, and builds a backtrace).
3. Engine opt-level 3 is worth about 10% of JS time, not a multiple.
4. The GC threshold shows 10 to 20% in the harness at the baseline allocation rate and nothing measurable in the app after the other fixes (A/B on the final build, 10 reps each: mount 1,000 JS 17.5 (13.8–35.8) with QuickJS's default against 14.4 (11.0–23.5) at 32 MB, mount 5,000 90.0 against 88.5, list replace 41.3 against 40.6).
5. Bytecode and minification do not speed up rendering.
6. A parent whose child list changed rebuilt the widget of every child (a new `FuseNodeWidget` per child on each rebuild). Found by a test written for stage 09; this is why sort got cheaper on the UI thread.
7. quickjs-ng, which is what rquickjs builds here (0.12.1), is not faster than Bellard's QuickJS in public benchmarks (Part C).

## Part B. Fixes, one at a time

Each stage is a commit and a saved release build; all builds were run back to back in one pass (`tools/run-builds.sh`), 7 reps each. Stages are cumulative, in this order. "Alone" figures are the step from the previous stage; no fix was measured in isolation against the baseline, so a fix whose effect depends on what came before is noted.

**mount_1000** (ms, median (min–max))

| build | n | JS | bridge call | decode | apply | frame | UI total | e2e | ops | KB | load |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 00 baseline | 14 | 85.5 (69.8–121) | 30 (25.4–46.7) | 28.6 (25.3–34.5) | 1.5 (1.2–3.45) | 28.8 (25.6–39.9) | 59.7 (54–71.2) | 196 (162–249) | 3737 | 239.8 | 0.51–0.95 |
| 01 QuickJS C at -O3 | 7 | 74.2 (58.3–80.1) | 29.6 (24.4–32.7) | 29.2 (27.1–36.3) | 1.4 (1.2–2.47) | 32.8 (27.3–37) | 63.4 (59.8–73.7) | 181 (168–195) | 3737 | 239.8 | 0.41–1.09 |
| 02 from_js fast path | 7 | 48.3 (40.3–55.4) | 6.72 (5.36–7.51) | 28.5 (26.1–30.9) | 1.31 (1.19–1.81) | 31.3 (24.9–40.6) | 59.9 (52.3–71) | 154 (132–175) | 3737 | 239.8 | 0.57–1.35 |
| 03 GC threshold 32 MB | 7 | 46.5 (39.7–68.8) | 6.21 (5.31–9.66) | 32 (26.6–36.5) | 1.8 (1.16–3.59) | 31.9 (26.3–50) | 67.2 (54.1–86.7) | 168 (144–183) | 3737 | 239.8 | 0.77–0.83 |
| 04 JSON batch | 7 | 49.6 (40.6–69) | 0.09 (0.07–0.13) | 5.82 (3.98–7.05) | 1.34 (0.78–1.94) | 40.1 (29.7–55.7) | 47.9 (35–64.4) | 121 (96.2–139) | 3737 | 239.8 | 0.50–0.70 |
| 05 FuseNode constructor | 7 | 43.8 (37.2–51.8) | 0.08 (0.07–0.09) | 3.98 (3.78–6.28) | 1.22 (1.21–1.56) | 37.2 (29.2–50.7) | 43.1 (34.5–56) | 104 (78.7–117) | 3737 | 239.8 | 0.50–0.96 |
| 06 per-key spread | 7 | 29 (26.6–43.7) | 0.07 (0.06–0.10) | 5.86 (4.03–11.1) | 1.37 (0.75–1.68) | 34.1 (28–50.9) | 44.6 (34.6–58.5) | 89.7 (82.5–100) | 3737 | 239.8 | 0.55–0.96 |
| 07 wrappers compiled as intrinsics | 7 | 21 (16.2–31.3) | 0.08 (0.06–0.11) | 3.86 (3.79–5.63) | 1.18 (0.76–1.68) | 40 (28.9–42.1) | 45.8 (33.8–48) | 73.2 (63.3–93.2) | 3737 | 239.8 | 0.57–0.69 |
| 08 flat journal, props in create | 7 | 14.4 (10.5–23.6) | 0.05 (0.04–0.06) | 1.17 (1.08–1.63) | 0.51 (0.41–0.68) | 36.5 (33.6–42.9) | 38.1 (35.1–45.2) | 69.8 (59.8–77) | 2007 | 82.2 | 0.57–0.76 |
| 09 Dart: one element, cached widget | 7 | 15.2 (11.3–44.2) | 0.06 (0.04–0.06) | 1.23 (1.05–1.72) | 0.45 (0.37–0.68) | 40.7 (30.9–44.6) | 42.5 (32.5–46) | 74.5 (48.6–83.1) | 2007 | 82.2 | 0.56–1.08 |
| 10 + prototypes (unused by this test) | 14 | 16.9 (10.9–24.6) | 0.05 (0.04–0.09) | 1.63 (1.12–2.4) | 0.61 (0.41–1.18) | 42.6 (31.2–63.3) | 44.4 (33–66.8) | 75.6 (65.3–96.4) | 2007 | 82.2 | 0.55–1.29 |
| 11 + non-finite check (branch head) | 7 | 14.2 (12–17.1) | 0.04 (0.04–0.07) | 1.12 (1.08–3.14) | 0.45 (0.41–1.03) | 36.7 (32.3–49.2) | 40.2 (33.8–51.5) | 71 (65–84.8) | 2007 | 82.2 | 0.61–1.09 |

**list_replace_500** (ms, median (min–max))

| build | n | JS | bridge call | decode | apply | frame | UI total | e2e | ops | KB | load |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 00 baseline | 28 | 203 (169–327) | 56.3 (49.6–85.2) | 60 (49.4–126) | 3.1 (2.56–8.04) | 97.4 (82.1–164) | 162 (137–258) | 459 (386–612) | 8000 | 493.5 | 0.51–0.95 |
| 01 QuickJS C at -O3 | 14 | 180 (163–263) | 57.4 (51.5–89.7) | 64.1 (52–77.1) | 3.08 (2.62–9.21) | 94.4 (80.6–126) | 162 (135–195) | 439 (400–526) | 8000 | 493.5 | 0.46–1.08 |
| 02 from_js fast path | 14 | 125 (114–200) | 12.4 (11.4–17.4) | 56.8 (51.5–89.7) | 3.15 (2.71–4.84) | 89.9 (74.4–131) | 150 (130–226) | 370 (334–446) | 8000 | 493.5 | 0.57–1.40 |
| 03 GC threshold 32 MB | 14 | 134 (116–211) | 14 (11.1–25) | 57.8 (48.9–77.9) | 3.27 (2.65–5.42) | 98.5 (74.9–140) | 156 (126–222) | 393 (343–541) | 8000 | 493.5 | 0.77–0.89 |
| 04 JSON batch | 14 | 132 (123–166) | 0.11 (0.11–1.73) | 10.8 (7.73–19) | 4.45 (2.83–6.43) | 99.5 (85.8–115) | 114 (98.9–132) | 269 (236–301) | 8000 | 493.5 | 0.50–0.70 |
| 05 FuseNode constructor | 14 | 129 (116–187) | 0.12 (0.11–0.18) | 9.55 (7.48–24.5) | 4.2 (2.49–8.5) | 93.9 (83.6–118) | 110 (103–130) | 248 (239–314) | 8000 | 493.5 | 0.50–0.96 |
| 06 per-key spread | 14 | 78.5 (67.1–105) | 0.12 (0.10–1.4) | 7.96 (7.29–13.1) | 4.03 (2.82–9.4) | 95.2 (87.2–116) | 107 (99–134) | 208 (187–242) | 8000 | 493.5 | 0.57–0.96 |
| 07 wrappers compiled as intrinsics | 14 | 52 (37–107) | 0.11 (0.11–1.36) | 9.77 (7.57–21.9) | 4.35 (3.07–9.06) | 100 (77.8–132) | 114 (98–153) | 181 (150–233) | 8000 | 493.5 | 0.57–0.72 |
| 08 flat journal, props in create | 14 | 40.5 (30.9–60.3) | 0.07 (0.05–0.10) | 2.2 (1.72–6.28) | 2.78 (1.86–6.04) | 96.3 (86.9–138) | 103 (93–143) | 155 (139–221) | 5500 | 160.0 | 0.57–0.76 |
| 09 Dart: one element, cached widget | 14 | 40.1 (27.4–59.6) | 0.08 (0.05–0.10) | 2.29 (2.09–4.29) | 2.76 (2.03–3.8) | 99.6 (83–129) | 105 (87.3–136) | 161 (135–192) | 5500 | 160.0 | 0.68–1.08 |
| 10 + prototypes (unused by this test) | 28 | 38.6 (28.8–59.1) | 0.07 (0.05–0.09) | 2.5 (1.63–4.23) | 2.77 (1.89–4.25) | 95.4 (74.4–132) | 102 (79.1–139) | 160 (125–190) | 5500 | 160.0 | 0.55–1.29 |
| 11 + non-finite check (branch head) | 14 | 43.8 (35–63.2) | 0.07 (0.05–0.11) | 2.9 (1.61–4.43) | 3.02 (2.07–4.1) | 105 (78.3–131) | 110 (84.8–138) | 172 (139–215) | 5500 | 160.0 | 0.61–1.09 |

Order checks pass in every row (40/40 per run).

All operations, medians only, one run of 7 per build (columns: 00 base, 01 O3, 02 fast path, 03 GC, 04 JSON, 05 ctor, 06 spread, 07 inline, 08 flat, 09 Dart, 10 prototypes, 11 head).

**JS task ms**

| Operation | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mount_200 | 15.6 | 16.0 | 9.28 | 9.72 | 12.7 | 9.03 | 7.93 | 4.59 | 3.68 | 2.60 | 3.69 | 3.02 |
| mount_1000 | 81.7 | 74.2 | 48.3 | 46.5 | 49.6 | 43.8 | 29.0 | 21.0 | 14.4 | 15.2 | 15.1 | 14.2 |
| mount_5000 | 429 | 335 | 296 | 308 | 337 | 287 | 192 | 112 | 86.9 | 81.2 | 87.1 | 101 |
| list_replace_500 | 193 | 180 | 125 | 134 | 132 | 129 | 78.5 | 52.0 | 40.5 | 40.1 | 37.9 | 43.8 |
| update_t1 | 0.17 | 0.16 | 0.14 | 0.15 | 0.15 | 0.16 | 0.15 | 0.14 | 0.13 | 0.14 | 0.13 | 0.15 |
| update_t50 | 1.38 | 1.32 | 1.21 | 1.15 | 2.17 | 0.91 | 1.06 | 1.18 | 0.82 | 1.02 | 0.79 | 1.11 |
| update_t1000 | 22.2 | 18.8 | 17.1 | 17.0 | 18.1 | 13.9 | 16.5 | 14.8 | 14.5 | 11.0 | 11.8 | 14.6 |
| update_c1000 | 27.6 | 29.1 | 16.8 | 21.2 | 18.4 | 17.6 | 17.8 | 12.0 | 10.1 | 12.0 | 12.5 | 16.1 |
| list_sort_2000 | 88.0 | 82.6 | 55.1 | 62.7 | 61.3 | 60.4 | 56.0 | 56.4 | 47.7 | 47.9 | 47.0 | 48.8 |

**UI thread ms (decode + apply + frame)**

| Operation | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mount_200 | 16.8 | 15.3 | 15.9 | 14.3 | 12.3 | 11.5 | 8.78 | 11.5 | 13.5 | 9.08 | 8.19 | 10.8 |
| mount_1000 | 57.1 | 63.4 | 59.9 | 67.2 | 47.9 | 43.1 | 44.6 | 45.8 | 38.1 | 42.5 | 45.2 | 40.2 |
| mount_5000 | 301 | 305 | 289 | 307 | 205 | 208 | 198 | 235 | 193 | 174 | 188 | 208 |
| list_replace_500 | 153 | 162 | 150 | 156 | 114 | 110 | 107 | 114 | 103 | 105 | 103 | 110 |
| update_t1 | 13.1 | 14.2 | 13.0 | 13.2 | 13.6 | 13.5 | 12.3 | 13.9 | 13.6 | 12.5 | 13.9 | 15.2 |
| update_t50 | 14.8 | 17.2 | 16.1 | 15.6 | 16.4 | 15.0 | 15.0 | 14.0 | 15.5 | 17.6 | 16.6 | 16.6 |
| update_t1000 | 77.3 | 86.5 | 80.2 | 89.5 | 90.8 | 83.5 | 78.7 | 79.6 | 82.8 | 83.2 | 83.8 | 87.3 |
| update_c1000 | 22.2 | 22.4 | 23.9 | 26.1 | 13.0 | 12.3 | 11.8 | 11.7 | 11.4 | 10.2 | 10.1 | 12.9 |
| list_sort_2000 | 115 | 116 | 115 | 119 | 111 | 113 | 112 | 115 | 112 | 87.3 | 88.8 | 90.4 |

**End to end ms**

| Operation | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mount_200 | 50.7 | 56.2 | 41.8 | 40.6 | 42.3 | 42.5 | 24.3 | 26.6 | 27.0 | 26.0 | 24.5 | 24.5 |
| mount_1000 | 196 | 181 | 154 | 168 | 121 | 104 | 89.7 | 73.2 | 69.8 | 74.5 | 75.6 | 71.0 |
| mount_5000 | 913 | 857 | 763 | 845 | 579 | 508 | 407 | 357 | 300 | 267 | 287 | 329 |
| list_replace_500 | 439 | 439 | 370 | 393 | 269 | 248 | 208 | 181 | 155 | 161 | 158 | 172 |
| update_t1 | 26.1 | 27.4 | 26.2 | 26.9 | 26.8 | 26.0 | 26.0 | 26.4 | 27.0 | 25.4 | 26.0 | 28.2 |
| update_t50 | 29.5 | 30.4 | 30.1 | 30.1 | 30.6 | 29.1 | 28.3 | 30.0 | 29.1 | 29.5 | 28.9 | 31.5 |
| update_t1000 | 119 | 131 | 111 | 122 | 123 | 115 | 111 | 111 | 113 | 100 | 111 | 114 |
| update_c1000 | 73.1 | 76.8 | 60.9 | 62.9 | 44.8 | 43.6 | 43.2 | 43.5 | 34.8 | 42.5 | 38.6 | 45.7 |
| list_sort_2000 | 245 | 243 | 226 | 235 | 193 | 201 | 183 | 199 | 176 | 151 | 157 | 165 |

### Each fix

| # | Fix | Effect of the step (mount 1,000 unless said) | Code (without tests) | Risk | Land as is |
|---|---|---|---|---|---|
| 01 | QuickJS C sources at `-O3` (`[profile.release.package.rquickjs-sys] opt-level = 3`); the Rust crate stays at "z" | JS 85.5 to 74.2; mount 5,000 457 to 335; harness 81.4 to 72.3. Nothing on UI. `libfjs.so` 9.64 to 10.02 MB (whole crate at 3: 13.47 MB, no extra gain) | 7 lines of Cargo.toml | None functional; +0.4 MB per ABI | Yes |
| 02 | `from_js` fast path: remember the class id of plain objects, skip the ArrayBuffer/typed-array/Date probes for them, `JS_IsArrayBuffer` before `ArrayBuffer::from_object` | bridge call 29.6 to 6.7; JS 74.2 to 48.3; list replace JS 180 to 125; end to end 181 to 154. Helps every channel message, not only ops | 47 lines of Rust, 2 tests | Low. Class-id comparison only; exotic objects take the old path | Yes, and upstream to fjs |
| 03 | Cycle-GC threshold 32 MB | Not measurable in the app (see above) | 18 lines | Higher peak heap | No. The knob (`fuseGcThresholdBytes`) stays, default off |
| 04 | One JSON string per flush (`JSON.stringify` in JS, `jsonDecode` in Dart); batches holding a value JSON cannot carry (Date, ArrayBuffer, typed array, BigInt, NaN, Infinity) go out structured as before | bridge call 6.7 to 0.09; decode 28.5 to 5.8; end to end 154 to 121; mount 5,000 end to end 763 to 579. JS task unchanged (stringify 3.5 to 5 ms replaces the conversion) but 15 ms of post-call work on the JS thread disappears | about 75 lines | Medium. Wire format; `undefined` inside arrays arrives as null. Non-finite numbers are detected by a scan of object-valued props (about 1 µs each, +0.7 to 1.1 ms per 1,000 nodes in the harness) | Yes, together with 08 |
| 05 | `FuseNode` assigns its fields in the constructor | JS 49.6 to 43.8 | 27 lines | None | Yes |
| 06 | Own `spread`: plain data props are set directly, getters share one effect, children and ref only when present; proxy props fall back to Solid's `spread` | JS 43.8 to 29.0; list replace JS 129 to 78.5; mount 5,000 287 to 192. Matters for every wrapper component, including user ones and `fuse gen` output | 77 lines | Medium. Replaces a Solid internal for the common case; renderer tests cover static, getter, children, ref, proxy | Yes |
| 07 | Compile `View`, `Text`, `Icon`, `GestureDetector`, `ScrollView`, `Stack`, `Positioned`, `TextField` as intrinsic elements when imported by name from `solid-fuse` (Babel plugin in `fuse dev`/`fuse build`, `inlineWrappers: false` turns it off) | JS 29.0 to 21.0; mount 5,000 192 to 112; list replace 78.5 to 52.0. Measured after 06, which had already removed most of the wrapper cost; before 06 this step would have been about 30 ms | 82 lines | Medium. Only named imports; aliased, namespaced and re-exported uses stay components (6 plugin tests). Dev-mode `_component` attribution unchanged | Yes |
| 08 | Flat journal (opcode, operands, ...) instead of one object per op; props set before the batch leaves JS ride in the node's `create` op | ops 3,737 to 2,007; 240 to 82 KB; JS 21.0 to 14.4; decode 3.9 to 1.2; apply 1.2 to 0.5; list replace JS 52.0 to 40.5; mount 5,000 end to end 357 to 300 | about 220 lines changed in `renderer.ts` and `runtime.dart` | Medium. Rewrites both ends of the wire. Node-reference props are not folded. 16 JS tests, 15 `applyOps` tests including remove+insert moves | Yes, with 04 |
| 09 | Dart: one element per node (the element listens to the node; no `ListenableBuilder`), one cached widget per node so unchanged siblings are not rebuilt, no typed-map copies | elements 3,395 to 2,757 per 1,000 nodes; mount frame unchanged within noise; sort 2,000: frame 89 to 71, UI 112 to 87, end to end 176 to 151 | about 85 lines | Low to medium. Debug error box and inspector strings kept; 5 widget tests | Yes |
| 10 | Template/clone op (prototype, hand-wired): the row shape is sent once, each row is one op with its values; JS keeps a node for the row root only | 500 rows: JS 33.9 to 3.5 on mount, 39.3 to 6.8 on replace; ops 5,005 to 1,005; 156 to 26 KB | 90 lines | Not for landing: nothing inside an instance can be updated or listened to from JS, templates are not re-sent after a reload. Shows what a compiler-emitted template could reach | No |
| 11 | `lazy` on `ScrollView` (prototype): `ListView.builder` over the node's children | 500 rows: frame 90 to 8.2 on mount, 104 to 9.2 on replace; end to end 141 to 60 | 50 lines, 1 widget test, documented as experimental | Low, opt-in. Needs `findChildIndexCallback` for keyed reorders of long lists and a pass over scroll-controller behaviour | Yes as experimental |

One serialized batch, the questions asked: JSON text parsed in Dart beats the value-by-value path by about 5x on the UI thread (decode of the same 240 KB batch 28.5 to 5.8 ms) and removes the conversion on the JS thread. Rust still copies the string twice (JS string to Rust `String` to Dart string); that is 0.09 ms for 240 KB, so a zero-copy path is not worth building. A binary format would only attack the remaining 1.2 ms of `jsonDecode` per 1,000 nodes.

### Recommended landing order

1. 02 (fjs fast path). Independent, lowest risk, helps all bridge traffic. Upstream it.
2. 05, then 04 + 08 as one change (one wire-format change instead of two), with the docs change in `architecture.mdx`.
3. 06, then 07 (with the `inlineWrappers` row in `packaging.mdx`).
4. 09.
5. 01, after checking the size budget per ABI.
6. `lazy` ScrollView as experimental once keyed reorder is handled.
7. Not as is: 03, the template op, the `FusePerf` counters and the bench harness (inert, but they are measurement code).

Follow-ups the data points to, not done:

- Dynamic text insert still costs 24 µs against 7 µs static (Solid's generic `insert` plus an effect). A text-only fast path in the renderer's `insert` would take about a third off list rows (two such inserts are 48 of the 68 µs a row costs).
- `applyOps` for the sort is 14.5 ms: `children.remove`/`insert` are linear, so 1,600 moves in a 2,000-row list is quadratic. The JS mirror (`indexOf` + `splice` in `insertNode`) has the same shape.
- A real template op from the compiler.

## Part C. The ceiling

### Floor in QuickJS with everything applied

Harness, final bundle, engine at -O3, no Flutter: the 1,000-node mount is 14.0 ms (12.5 to 22.5), 14 µs per node, 7 µs per op; 75 ms at 5,000 nodes.

| Part | ms per 1,000 nodes | Note |
|---|---:|---|
| Static tree: nodes, props, inserts, journal, `JSON.stringify` | 5.2 | 5 µs per node. A hand-written replica of only the journal writes plus stringify is 3.1; allocating the same number of plain objects is 2.6 |
| Reactive bindings of the screen (dynamic props and text) | 7 to 8 | Solid internals: a render effect is 10 to 11.5 µs, a memo 9.2, a signal 2.8, a dynamic text insert 24 |
| `For`, components, the rest | about 1 | |

What only a faster engine (or less JavaScript) fixes: the cost of creating and running Solid's reactive nodes, the keyed reconcile (sort of 2,000 rows: 48 ms JS), the 1,000-effect update (12 to 15 µs per effect run) and app code. What a template op fixes without a faster engine: the static part, down to about 1.4 µs per node (3.5 ms for 2,500 nodes).

The same bundle in Bun (JavaScriptCore with JIT) mounts 1,000 nodes in 3.3 to 4.4 ms warm, so a JIT is worth 3 to 4x here. No JIT is available to an app on iOS.

After these changes the JS thread is about 20% of the end-to-end time of a mount (14 of 71 ms); the frame is more than half. A 2x faster interpreter would take the 1,000-node mount from 71 to about 64 ms. Lazy building takes a long list from 141 to 60.

### Engine options without a JIT

Nothing here was measured by me except the Bun figure above. Ratios are from public benchmark tables of the V8 v7 suite (Richards, DeltaBlue, Crypto, RayTrace, EarleyBoyer, RegExp, Splay, NavierStokes), which is numeric and allocation heavy; how they transfer to a reactive renderer is not verified.

| Engine | Speed against Bellard QuickJS, interpreter only | Notes for Flutter on iOS and Android |
|---|---|---|
| quickjs-ng (what fjs builds: rquickjs switched to it in 0.9.0, here at 0.12.1) | 0.78x on Linux x64, 1.06x on macOS arm64, 0.99x on macOS x64, 0.87x on Windows [1] | Releases since 0.12 list interpreter work (inlined int/float arithmetic and fast-array reads, arena allocator, 0.16 to 0.18) [2]; effect not measured |
| Bellard QuickJS | 1.0 | The 2026-06-04 release claims 42% faster than its predecessor on the same suite [3]; not verified. rquickjs currently uses functions that exist only in -ng [4] |
| Hermes, bytecode compiled at build time, interpreted | 1.84x Linux, 1.60x macOS arm64, 1.75x macOS x64, 1.66x Windows [1]; Bellard's older table has it level with QuickJS (968 against 942) [5] | Bytecode is memory-mapped; this is how React Native uses it [6]. "Hermes V1" is the default in React Native 0.84; published gains are app-level percentages, no interpreter ratio I could verify [7] |
| Static Hermes native compilation (`shermes`) | No figure for untyped code that I could verify | Compiles JS to native code ahead of time, also untyped; typed mode is "not ready for use" [6]. Per-architecture build step; the dev loop would still need the interpreter |
| JavaScriptCore without JIT (LLInt) | About 2x: one 2020 measurement put QuickJS slightly under half of JIT-less JSC, and JIT-less JSC 7.5x slower than JSC with JIT [8] | System framework on iOS, so no size cost there; has to be shipped on Android |
| V8 `--jitless` (Ignition) | 2.0x in Bellard's table (1,916 against 942) [5]; the 2020 measurement has it about 2x JIT-less JSC [8]. Against its own JIT: 40% slower on Speedometer 2, 80% on the Web Tooling Benchmark [9] | Large: 28 MB executable in Bellard's table [5], about 7.5 MB as an Android library in 2020 [8] |

Further tables I could not read from here: zoo.js.org (the engines zoo Bellard's page links to).

Read together: without a JIT the best available step is 1.6 to 2x (Hermes or V8 jitless), on a part of the pipeline that is now a fifth of a mount. Staying on QuickJS and updating quickjs-ng, or building Bellard's 2026 release if rquickjs supports it again, is the cheap experiment and should come first.

### Cost of swapping, given fjs

fjs is written against rquickjs: value conversion, class ids, the module loader, the async driver and the built-in web APIs all use QuickJS types. A different QuickJS (newer -ng, or Bellard's) is a dependency change in rquickjs-sys. Any other engine means replacing that layer: V8 has maintained Rust bindings but brings the size above and a harder mobile build; Hermes exposes a C++ API (JSI) and I found no C API in its README [6], so it needs a C++ shim plus a rewrite of every binding. I would budget weeks for V8 and more for Hermes; that is an estimate, not a measurement.

## What could not be measured

- Phones. Everything is x64 desktop with software raster; raster-thread times are not representative and are not quoted. Ratios between JS, bridge and UI will differ on ARM.
- Each fix in isolation (only the cumulative chain), and the two prototypes combined.
- Why the frame's "rest" phase grew from about 5 to about 14 ms per 1,000-node mount once decode became short (frame 28.8 before stage 04, 36 to 42 after; UI total still fell from 60 to 40 to 44). Build, layout and paint did not change. Dart GC of the decode garbage moving into the frame, or frame timing under xvfb, are candidates; neither was tested.
- The single-node update is 27 ms end to end before and after: 0.15 ms of JS, the rest is waiting for and running a frame in this environment. Nothing in this work addresses it and I did not break it down further.
- Memory. Heap growth per 1,000 nodes was 2.8 MB and 13,048 objects at baseline; not re-measured per stage.
- Other engines were not built or run.
- The final builds were measured with the GC threshold at 32 MB; the branch head has it off. The A/B above shows no resolvable difference.
- `bun test` for the whole package hangs in `src/navigator.test.ts`; it does so on the starting commit too. The new tests were run by file.

## Rerun

```bash
export PATH=/opt/flutter/bin:$PATH
cd wt/perf && bun install && (cd packages/solid-fuse && bun run build)
cd examples/perf_bench && bun fuse link && bun fuse build --js-only
(cd dart && flutter build linux --release --no-tree-shake-icons)

tools/run.sh core 7 results/r11/core-x.txt          # the table at the top
tools/run.sh tpl 7 results/r11/tpl-x.txt            # template op and lazy ScrollView
tools/run.sh attr 5 results/r11/attr-x.txt          # frame phases, plain-Flutter baseline, decode steps
python3 tools/agg11.py --cmp results/r11/core-a.txt results/r11/core-b.txt
python3 tools/agg11-stages.py mount_1000 "a=results/r11/core-a.txt" "b=results/r11/core-b.txt"
python3 tools/agg-attr.py results/r11/attr-x.txt

# several saved builds back to back (each a copy of dart/build/linux/x64/release/bundle)
BUILDS=/path/to/builds tools/run-builds.sh core 7 -tag 00-base 11-final
BENCH_GC_MB=32 tools/run.sh core 5 out.txt          # GC threshold A/B (0 = QuickJS default)

# JS only, real engine, no Flutter
(cd ../../packages/solid-fuse/dart/lib/src/fjs/libfjs && cargo test --release --no-run)
python3 tools/abl-cmds.py > /tmp/cmds.jsonl
tools/harness.sh <path to the fjs test binary> /tmp/cmds.jsonl out.txt && python3 tools/abl-agg.py out.txt

# tests
(cd ../../packages/solid-fuse && bun test --conditions browser src/renderer.test.ts cli/inline-wrappers-plugin.test.ts)
(cd ../../packages/solid-fuse/dart && flutter test test/apply_ops_test.dart test/node_widget_test.dart)
(cd ../../packages/solid-fuse/dart/lib/src/fjs/libfjs && cargo test --release value_tests)
```

Raw output of every run quoted here: `examples/perf_bench/results/r11/` (`core-*-f.txt` and `-f2.txt` are the final pass, `tpl-11-final-f.txt`, `attr-*`, `gcab-*`, `abl-*`, `floor-final-o3.txt`). An empty output file means xvfb failed to start; rerun it.

## Sources

1. ahaoboy, "js-engine-benchmark", results of July 2025: https://dev.to/ahaoboy/js-engine-benchmark-2025-7-8-163b
2. quickjs-ng releases: https://github.com/quickjs-ng/quickjs/releases and differences from Bellard's QuickJS: https://quickjs-ng.github.io/quickjs/diff
3. QuickJS news, 2026-06-04: https://bellard.org/quickjs/
4. rquickjs changelog (0.9.0 switched to quickjs-ng): https://docs.rs/crate/rquickjs/0.12.0/source/CHANGELOG.md
5. QuickJS benchmark page (bench-v8 version 7; Core i5 4570, undated, old engine versions): https://bellard.org/quickjs/bench.html
6. Hermes README, `static_h` branch: https://raw.githubusercontent.com/meta/hermes/static_h/README.md
7. Software Mansion on Hermes V1 in React Native 0.82: https://swmansion.com/blog/welcoming-the-next-generation-of-hermes-67ab5679e184 and a secondary article on 0.84: https://www.tothenew.com/blog/hermes-v1-by-default-in-react-native-0-84-the-biggest-performance-win-of-2026/
8. A. Coote, "To JSC or not to JSC: running JavaScript on iOS in 2020": https://dev.to/alastaircoote/to-jsc-or-not-to-jsc-running-javascript-on-ios-in-2020-44ba
9. V8 blog, "JIT-less V8": https://v8.dev/blog/jitless
