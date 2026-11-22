# Report 15: render cost on the updated `main`

## Summary

The benchmark is ported to `main` (worktree `/home/claude/wt/rebase`, branch `spike/rebase`, five commits, nothing pushed) and the core suite was measured on the unmodified renderer and widgets: release build, 15 reps per cell (30 for operations the suite runs twice), 5 interleaved passes with semantics off and on, load average 0.24 to 0.87.

- **JS task on main is about half the old baseline, and far above yesterday's spike result.** Mount of 1,000 nodes: 85.5 ms old baseline, 45.5 ms on main, 2.0 ms with all spike fixes. That is 45 µs per node on main.
- **The gain comes from two things main already has:** the JSON-string batch (bridge call 29 ms to 0.3 ms) and Solid 2.0.3's cheaper `spread` (a `View` with 4 props: 79.5 µs to 35 µs).
- **QuickJS itself is roughly 20 to 35% faster on engine-only micro benchmarks, not a multiple.** `main` still builds the engine at opt-level "z".
- **The UI thread is unchanged from the old baseline's Dart side**, apart from decode. Mount 1,000: 25 ms with semantics off, 39 ms on.
- **Keyed list moves are broken on main.** Sort, shuffle, reverse and filter throw in `applyOps` and no frame is drawn; 16 of 80 order checks pass per semantics state (only the replace checks). Their JS time is also 2.6 to 5.7 times the old baseline. I did not fix this: the edit was blocked by the permission system, and it is outside "unmodified renderer".
- **Static props on intrinsic elements are dropped on main.** The new compiler passes them as a second argument to `createElement`, which the renderer ignores. The built-in `View`/`Text` wrappers are not affected because they only spread.
- **The Rust JS-only harness ported cleanly** and agrees with the app (43 ms against 45.5 ms for mount 1,000).

Not measured: UI and end-to-end for the four list-move operations, a `perf` profile, and the in-app `micro` suite.

## Comparison table

All figures are medians in ms, measured. The columns are:
- **Old baseline:** report 11 start, n = 14, semantics on (the Linux default; the switch did not exist then).
- **Old, all fixes:** `03-lean-all` from report 14, with templates and the lean path, n = 18 (36 for operations run twice), given as semantics off / on.
- **Main:** this run, given as semantics off / on.

Only the "on" figures are comparable with the old baseline. "UI thread" is decode + `applyOps` + frame, as in reports 11 and 14.

**JS task**

| Operation | Old baseline (on) | Old, all fixes (off / on) | Main (off / on) |
|---|---:|---:|---:|
| mount 200 | 16.5 | 0.70 / 0.76 | 9.88 / 9.82 |
| mount 1,000 | 85.5 | 1.96 / 1.98 | 45.5 (41–59) / 46.7 (41–61) |
| mount 5,000 | 457 | 6.6 / 7.9 | 226 (188–303) / 264 (201–301) |
| list replace 500 | 203 | 24.5 / 23.0 | 133 (107–202) / 140 (112–201) |
| update, 1 text | 0.19 | 0.14 / 0.15 | 0.14 / 0.15 |
| update, 50 texts | 1.43 | 0.85 / 0.89 | 1.04 / 1.04 |
| update, 1,000 texts | 22.4 | 12.4 / 11.6 | 17.4 / 19.1 |
| update, 1,000 colours | 28.6 | 17.3 / 13.8 | 23.8 / 22.4 |
| sort 2,000 | 88.4 | 65.7 / 48.6 | 234 / 239 |
| shuffle 2,000 | 81.8 | 55.4 / 50.1 | 319 / 325 |
| reverse 2,000 | 124 | 78.7 / 74.8 | 413 / 421 |
| filter 2,000 to 1,000 | 44.7 | 21.6 / 23.3 | 253 / 280 |

**UI thread**

| Operation | Old baseline (on) | Old, all fixes (off / on) | Main (off / on) |
|---|---:|---:|---:|
| mount 200 | 17.2 | 9.7 / 13.9 | 7.0 / 11.3 |
| mount 1,000 | 59.7 | 21.4 / 35.8 | 25.4 (21–43) / 39.4 (32–55) |
| mount 5,000 | 309 | 119 / 148 | 158 (136–192) / 224 (204–256) |
| list replace 500 | 162 | 76.1 / 94.7 | 76.5 (65–113) / 117 (101–164) |
| update, 1 text | 13.8 | 9.1 / 14.4 | 8.7 / 13.6 |
| update, 50 texts | 15.8 | 11.7 / 16.6 | 9.9 / 17.3 |
| update, 1,000 texts | 81.8 | 59.9 / 79.3 | 49.4 / 81.2 |
| update, 1,000 colours | 24.2 | 9.7 / 9.2 | 12.4 / 12.1 |
| sort 2,000 | 123 | 26.0 / 88.0 | no frame (`applyOps` throws) |
| shuffle 2,000 | 123 | 26.1 / 91.6 | no frame |
| reverse 2,000 | 129 | 26.5 / 87.0 | no frame |
| filter 2,000 to 1,000 | 88.6 | 47.3 / 73.2 | no frame |

**End to end**

| Operation | Old baseline (on) | Old, all fixes (off / on) | Main (off / on) |
|---|---:|---:|---:|
| mount 200 | 56.5 | 23.3 / 26.9 | 39.6 / 43.6 |
| mount 1,000 | 196 | 36.9 / 51.7 | 85.4 (82–118) / 99.1 (91–130) |
| mount 5,000 | 964 | 149 / 176 | 400 (341–510) / 504 (432–552) |
| list replace 500 | 459 | 111 / 127 | 226 (192–310) / 274 (226–337) |
| update, 1 text | 27.0 | 22.3 / 27.4 | 30.1 / 32.9 |
| update, 50 texts | 30.0 | 24.7 / 30.3 | 32.8 / 39.0 |
| update, 1,000 texts | 124 | 91.6 / 109 | 81.0 / 113 |
| update, 1,000 colours | 75.6 | 41.2 / 41.1 | 44.2 / 43.8 |
| the four list moves | 153 to 289 | 86 to 125 / 110 to 180 | not measurable |

**Frame phases on main, mount 1,000 (off / on):** build 6.7 / 6.7, layout 8.9 / 12.5, paint 1.8 / 1.9, semantics 0 / 7.4. Other main figures for the same mount: `jsonDecode` 4.5 ms, `applyOps` 1.4 ms, bridge call 0.30 ms, 3,737 ops, 232 KB.

**Tree counts, 91 cards:** main creates 3,395 elements and 1,107 render objects. The same cards as plain Flutter (`NativeScreen`) create 1,485 and 1,083, with a frame of 13.8 ms off / 29.4 ms on, against 18.0 / 32.0 for main.

The list-move failures do not contaminate later reps: mount 1,000 JS by rep is 49.5, 41.8, 44.6 ms.

## JS attribution on main

Rust harness, real engine, 91 cards = 1,001 nodes, two runs. The differences between variants are measured; reading each difference as one cause is my interpretation.

| Part | ms | How |
|---|---:|---|
| Whole mount (`card_for`) | 43.7 to 45.3 | measured; 45 µs per node |
| Wrapper components and `spread` | about 20 | `card_for` minus `card_compiled` (23.2 to 24.9); about 32 µs per element |
| Reactive bindings (1 effect + 4 dynamic text inserts per card) | about 10 | `card_compiled` minus `raw` (13.8 to 14.6) |
| Static tree: nodes and op objects | about 9 | `raw` minus stringify |
| `JSON.stringify` of the batch | 4.7 to 5.0 | `objonly_json`; in-app detail pass 5.0 to 5.4 |
| `fjs.bridge_call` | 0.3 to 0.4 | timer around the call |

- **`card_compiled` is hand-written.** It mirrors the compiler's output for the intrinsic card with the static props applied through `setProp`. The compiled `card_intrinsic` (16.5 ms) undercounts, because main drops those props.
- **Scaling is superlinear.** At 454 cards `card_for` costs 246 to 272 ms, 5.6 times the 91-card figure, as in the old runs; I did not re-attribute this to GC.
- **`from_js` exception.** The per-object TypeError is gone by code reading: `value.rs` now gates the ArrayBuffer probe behind an `instanceof` check. Timing agrees: sending 3,731 plain op objects structured cost 38.3 ms in the old harness and 9.4 ms now (10.3 to 2.5 µs per object). I did not confirm it with `perf`; the release library is stripped.

## QuickJS old against new

Same harness and source, opt-level "z" in both. Old figures are from `results/r11/abl-z.txt` (yesterday, rquickjs 0.12.1); new figures are two runs on main. All in µs per iteration.

| Micro | Old | New |
|---|---:|---:|
| empty loop iteration | 0.07 | 0.05 to 0.06 |
| function call | 0.10 | 0.07 |
| object literal, 4 fields | 0.57 | 0.36 to 0.37 |
| closure | 0.59 | 0.28 to 0.46 |
| object with 2 getters | 2.04 | 0.98 to 1.40 |
| plain constructor, 6 fields | 0.97 | 0.73 |
| class with fields (`FuseNode` shape) | 4.29 | 3.74 to 3.88 |
| `Promise.resolve().then` | 1.51 | 1.26 to 1.31 |
| `Map.set` with a string key | 0.46 | 0.40 to 0.59 |
| property read ×4 | 0.13 | 0.11 to 0.13 |

The rows below also include Solid's change from the beta to 2.0.3, so they are not engine-only.

| Micro | Old | New |
|---|---:|---:|
| signal | 3.46 | 1.85 to 1.97 |
| memo | 9.76 | 9.1 |
| render effect | 10.4 to 13.2 | 8.6 to 10.4 |
| `createComponent` | 0.69 | 0.58 |
| `merge` of 2 static sources | 7.9 | 4.7 |
| `spread` with 4 props, no children | 51.2 | 31 to 32.5 |
| `View` with 4 props | 79.5 | 35 to 36 |
| `Text` with a child | 87.9 | 38 to 39 |
| dynamic text insert | 37.9 | 27.5 |
| read through an `omit` view | 0.13 | 2.1 (slower) |
| read through a merge proxy | 5.4 | 7.2 (slower) |

The bundler also changed (Babel/esbuild to Oxc/rolldown), and the old run was on a different day on the same machine, so differences under about 15% are not resolved.

## Yesterday's fixes against main

**Already on main**
- JSON string per batch. Main still builds one object per op; it has no flat journal.
- The fjs plain-object fast path, now fixed upstream.
- Part of the `spread` cost, from Solid 2.0.3 itself.

**Still applies (not on main)**
- **Flat op journal with props folded into create:** static tree plus stringify is still about 14 ms per 1,000 nodes.
- **`FuseNode` constructor:** class fields still compile to `defineProperty` helpers at es2020 (3.8 µs against 0.73 µs).
- **Per-key spread and intrinsic wrappers:** wrappers are still the largest JS item at about 20 of 45 ms. Intrinsic wrappers need the `createElement` props bug fixed first.
- **Templates:** these gave the 2 ms figure; nothing on main approaches it.
- **Keyed-move fix and block list editor:** the fix is now a correctness requirement.
- **Dart side:** main still has a `ListenableBuilder` per node (3,395 elements per 1,000 nodes), `Map.from` copies, and none of parse-once or the lean path.
- **Engine at opt-level 3 for the QuickJS C sources:** main is at "z"; I did not re-measure the gain.

**Needs rework rather than a port**
- The Babel `inlineWrappers` plugin and the Babel template plugin: Babel is no longer in the pipeline.
- The NaN/Infinity structured fallback: main always stringifies, and fjs now caps structured conversion at 100,000 values, so the fallback would need a different design.
- The GC threshold knob: it showed no gain yesterday and I did not retest it.

## Compiler notes (`@solidjs/compiler` 2.0.2, universal mode)

These come from reading the types and compiling small samples.

- **Intrinsic elements:** static props, including function values, are collected into an object and passed as `createElement("view", {...})`. Each dynamic prop gets one `effect(compute, apply)`, and dynamic children get `insert(el, () => ...)`.
- **Wrapper components:** `createComponent(View, { static: value, get dynamic() {...}, get children() {...} })`.
- **Spread:** `<view {...props} />` compiles to `spread(el, props, false)`. Mixed attributes become `spread(el, [props, { get onTap() {...} }], false)`, an array of sources resolved in one effect, plus one `insert` for children. That is two effects per element where the beta had three.
- **No template or hoisting in universal mode:** every element is a separate `createElement` call, and constant prop objects are re-created per instance. `hoistProps` is SSR-only.
- **Where a transform can hook in now:**
  - A Vite plugin with `enforce: "pre"`, placed before `solidPlugin` and working on JSX source with any parser (Oxc or other). This is the simplest route for wrapper inlining or templates.
  - A post-transform plugin over the compiler's regular output (`createElement` + `insertNode` runs are easy to pattern-match).
  - The `frontends` option, per file extension only.
  - `babel: {...}` or `compiler: "babel"`, which reintroduce Babel.
  - The compiler's `renderers` option, which maps element names to a different `moduleName`. It could route some tags to a second runtime.
  - The native compiler has no plugin API of its own.

## Bugs found on main (not fixed)

1. **Keyed list moves throw.** `applyOps` disposes a node on `remove`, then the `insert` of the same node fails with "Null check operator used on a null value" (`runtime.dart`, `registry.get`). Sort, shuffle, reverse and filter-after-move leave the Dart tree stale. The fix from yesterday's first spike commit (`0835791`: deferred disposal in Dart, detach-before-insert in JS `insertNode`) is not on main.
2. **List-move JS time regressed:** 234 to 421 ms against 88 to 124 ms, with an identical op stream (for example 1,243 removes + 1,998 inserts for sort). My hypothesis, not verified, is that the missing detach in JS `insertNode` leaves duplicate entries in `children`, which makes the `indexOf` scans longer.
3. **Static props on intrinsic elements are lost.** `<view width={40} onTap={f}>` emits `create` with empty props; I verified this with a small script against `dist`. Nothing in `packages/solid-fuse/src` uses intrinsics with static attributes, so the built-ins work.
4. **`fuse build --js-only` no longer exists.** The flag is passed through to `flutter build`, which fails with exit 64 after the bundle is written.
5. **`import 'package:flutter/material.dart'` is reported as deprecated** by the installed Flutter (info level only).
6. **Minor:** the `solid-fuse` dist is now minified, while app bundles are not.

## Not measured

- UI thread and end to end for the four list-move operations.
- A `perf` profile of the JS thread.
- The in-app `micro` suite (it is ported; the harness was used instead).
- A re-attribution of GC cost.
- Profile-mode builds, heap figures, and the animation, template and lazy suites (not ported).
- An old-baseline run with semantics off (it never existed).

## Rerun

```bash
export PATH=/opt/flutter/bin:$PATH
cd /home/claude/wt/rebase && bun install && (cd packages/solid-fuse && bun run build)
cd examples/perf_bench && bun fuse link && (cd dart && flutter create --platforms=linux .)
bun fuse build linux --release --no-tree-shake-icons
tools/r15-run.sh 5 3
python3 tools/r15-agg.py "off=results/r15/core-s0-p*.txt" "on=results/r15/core-s1-p*.txt"
BENCH_SEMANTICS=0 tools/run.sh native 7 results/r15/native-s0.txt
(cd ../../packages/solid-fuse/dart/lib/src/fjs/libfjs && cargo test --release --no-run)
python3 tools/abl-cmds.py > /tmp/cmds.jsonl
tools/harness.sh <libfjs/target/release/deps/fjs-…> /tmp/cmds.jsonl results/r15/harness-x.txt
python3 tools/abl-agg.py results/r15/harness-x.txt
```

The core results were taken with the bundle from commit `801df20`; the later bundle differs only in `src/micro.tsx`. A copy of that build is in `/home/claude/wt/rebase-builds/00-main`.

## Commits on `spike/rebase`

- `5520077` inert `FusePerf` hooks (`perf.dart`, `perfChannels`, timed `_ops` path)
- `75704f9` Rust harness `libfjs/src/tests/bench_harness.rs`
- `ecf55db` `examples/perf_bench` port
- `801df20` configurable frame timeout
- `f76b4e2` r15 results, `card_compiled` variant, README

Raw results and the generated tables (`core-tables.md`) are in `/home/claude/wt/rebase/examples/perf_bench/results/r15/`.
