# perf_bench

Render benchmark: a real solid-fuse app (bundle built by `fuse build`, QuickJS
engine, Flutter Linux desktop) with a Dart driver that runs scenarios, takes
timings on both sides of the bridge and prints one `BENCH {json}` line per
measurement. Ported from the `spike/perf` and `spike/dartside` branches
(reports 10, 11, 14) to `main`; only what the `core` suite needs was kept.

## Layout

| Path | What |
|---|---|
| `src/harness.ts` | JS-side timing (`performance.now()` inside QuickJS), batch and byte counting around `fjs.bridge_call` |
| `src/screens.tsx` | Card screen, one-signal update screen, keyed list (unchanged from report 11) |
| `src/micro.tsx` | JS-only ablation variants of the card mount and micro benchmarks |
| `src/index.tsx` | Command table driven from Dart over the `bench` channel |
| `dart/lib/harness.dart` | Dart-side timing: op receipt, apply, frame start/end, UI-isolate heartbeat |
| `dart/lib/suite.dart` | `BenchBinding` (frame phases, semantics switch), tree counts, `NativeScreen`, suites `core`, `native`, `micro` |
| `tools/run.sh` | One run under xvfb, saves the `BENCH`/`HARNESS` lines |
| `tools/r15-run.sh`, `tools/r15-agg.py` | Interleaved passes with semantics off and on; pooled tables |
| `tools/harness.sh`, `tools/abl-cmds.py`, `tools/abl-agg.py` | JS-only runs in the Rust harness (`libfjs/src/tests/bench_harness.rs`) and their tables |
| `results/` | Raw output of the runs the reports quote |

Framework hooks this uses (inert unless set): `FusePerf.onOps`,
`FuseRuntime.perfChannels` (`packages/solid-fuse/dart/lib/src/perf.dart`).

## Rerun

```bash
export PATH=/opt/flutter/bin:$PATH
bun install                                   # repo root
(cd packages/solid-fuse && bun run build)     # solid-fuse dist

cd examples/perf_bench
bun fuse link                                 # once: pub get, pubspec_overrides
(cd dart && flutter create --platforms=linux .)   # once: dart/linux is not committed
bun fuse build linux --release --no-tree-shake-icons   # bundle + Flutter build (first build compiles the Rust engine)

tools/run.sh core 3 results/out.txt           # one run; BENCH_SEMANTICS=0 turns semantics off
tools/r15-run.sh 5 3                          # 5 interleaved passes x 3 reps, semantics off and on
python3 tools/r15-agg.py "off=results/r15/core-s0-p*.txt" "on=results/r15/core-s1-p*.txt"
tools/run.sh native 7 results/native.txt      # the cards as plain Flutter widgets
tools/run.sh micro 1 results/micro.txt && python3 tools/abl-agg.py results/micro.txt   # in-app JS ablation + micro

# JS only, real engine, no Flutter
(cd ../../packages/solid-fuse/dart/lib/src/fjs/libfjs && cargo test --release --no-run)
python3 tools/abl-cmds.py > /tmp/cmds.jsonl
tools/harness.sh <path to the fjs test binary> /tmp/cmds.jsonl out.txt && python3 tools/abl-agg.py out.txt
```

An empty output file means xvfb failed to start; rerun it (`r15-run.sh` retries).

## What a record contains

| Field | Meaning | Clock |
|---|---|---|
| `jsMs` | uninterrupted JS: the operation, Solid's flush, `JSON.stringify` of the op batch and handing it to the bridge | `performance.now()` in QuickJS |
| `sendMs` | the part of `jsMs` spent inside `fjs.bridge_call` | same |
| `batches`, `bytes` | op batches sent and their JSON length; `ops`, `kinds`, `stringifyMs` only in the detail pass | |
| `toRecvMs` | command sent to `applyOps` about to start | `Timeline.now` |
| `decodeMs` | how long the UI isolate's event-loop turn had already run when `applyOps` started: receiving and decoding the batch (1 ms heartbeat resolution) | heartbeat |
| `jsonDecodeMs` | `jsonDecode` of the batch | `Timeline.now` |
| `applyMs` | `FuseRuntime.applyOps` | `Timeline.now` |
| `uiFrameMs` | begin-frame to post-frame callback of the frame that shows the ops | `Timeline.now` |
| `buildMs`, `layoutMs`, `paintMs`, `semanticsMs`, `restMs` | phases of that frame (`BenchBinding`); `restMs` is compositing bits + composite + semantics + finalize | `Timeline.now` |
| `e2eMs` | command sent to that frame finished on the UI thread | `Timeline.now` |
| `load` | 1-minute load average when the record was taken | `/proc/loadavg` |

"UI thread" in the reports is `decodeMs + applyMs + uiFrameMs`.
