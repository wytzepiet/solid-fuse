# 18. What skipping static bindings would gain (prototype in Solid)

2026-11-22. Follow-up to report 17. Not landed anywhere: a patch against the published `@solidjs/signals` 2.0.3 production build (`patches/spike-solid-probe.patch`, mangled names, applies to `dist/prod/core/core.js` and `effect.js`), used only to measure.

## What the prototype does

A render effect created by the compiler (`effect`, `insert`; options sync + transparent, no `schedule`/`defer`) runs its first compute on a spare effect node that is not linked into the owner tree.

- Nothing recorded (no dependencies, no children, no cleanups, no flags, no async state): the value is applied at once and the spare is kept for the next binding. No node is allocated.
- Something recorded: the spare becomes the effect. It is linked into its owner and goes through the normal first `recompute` with a stub that re-links the recorded dependencies and returns the value, so the expression runs once.
- The compute threw: children and dependencies of the spare are dropped and the normal path runs (the expression runs twice; only this case).
- Not tried when a verdict window, snapshot capture or a lane pass is active.

## Numbers

JS-only harness (QuickJS through fjs, O3), same VM and same caveats as report 17. Median of 24 (mount 1,000), 12 (others), 18 (list replace), bundles alternated; a second run in the other order gave the same picture. Batch bytes identical in both columns.

| JS ms, median | main (`4096002`) | + probe |
|---|---:|---:|
| mount 1,000 nodes (91 cards, 5 bindings each, all static) | 16.0 | 7.3 |
| mount 5,000 nodes | 83.0 | 34.2 |
| list replace 500 rows | 33.6 | 19.9 |
| mount update screen (1,000 rows, 2 bindings each, all reactive) | 80.9 | 67.9 (within noise) |

So about half of the mount, not the "roughly 3 ms" guessed in report 17 from the fully static card. What is left on the card screen is not effects: `<For>` row owners, `createComponent`, `insert`'s normalise/flatten, closures and the ops themselves. Reactive bindings are not slower.

## Checks

`bun run test` in `packages/solid-fuse` with the patch: all 65 pass, including the fixtures that compare trees after mount and 10 update steps (`For`, `Show`, dynamic children). In that run 35 bindings took the static path and 53 were adopted.

## Not covered by the prototype

- An error thrown by the apply step of a static binding does not go to an error boundary.
- Boundaries, transitions/lanes, hydration ids and dev tooling were not looked at beyond the bail-outs above; Solid's own test suite was not run.

## Addendum, same day: against Solid's source and test suites

Solid cloned at `a406a5d` (main, signals 2.0.3 plus later fixes). Two designs, both as patches against `packages/signals/src` (apply with `git apply` in a clone at that commit; they contain test-only switches `PROBE_ALL`, `PROBE_OFF`, `PROBE_STATS` read from `process.env`):

- **Probe** (`patches/spike-solid-probe-src.patch`): the design above, fixed until Solid's suites pass. What the first prototype had wrong: it dropped a cleanup returned by the effect function; it missed reads through `isPending`/`latest` (now any `read`, `getOwner` or `getObserver` during the run counts as recorded); a compute that throws is now adopted and the throw replayed, so nothing runs twice; it did not set the `stale` read mode render effects run in; the spare is linked into the owner tree during the run; the apply step goes through `runEffect`; it does not try while a transaction (hold) is open, which one web test needed (`e3-derived-store-heal-4451`, nested `Loading`).
- **Recycle** (`patches/spike-solid-recycle.patch`, 139 lines): create the effect the normal way (or take the spare), run the normal `recompute` and `runEffect`, then if the node is empty (no deps, children, disposal, cleanup, extension, status, flags, config change, and nothing read or asked for the owner) unlink it and keep it as the spare. Same code path as today, no bail-outs.

Tests, both designs: signals 7,263 with the change forced on for every render effect (`PROBE_ALL=1`), universal 61, solid-js 936, web client 2,040, web hydrate 801 all pass; web server 2,226 of 2,227, the one failure (`server-functions-adapter-request`) also fails with the change switched off. solid-fuse's 65 tests pass. How often the static path ran: signals 49, universal 12, solid-fuse 35, web 0 (its dev build calls `getOwner()` in every compute). So Solid's suites mostly prove that reactive effects are unaffected.

JS ms, median, same harness, production builds of `a406a5d` (one run of 6 rounds, three bundles alternated; a second run of 10 rounds for head and probe agreed):

| | head | recycle | probe |
|---|---:|---:|---:|
| mount 1,000 nodes, all bindings static | 12.6 | 9.6 | 7.1 |
| mount 5,000 nodes | 62.1 | 48.4 | 33.6 |
| replace 500 list rows | 36.8 | 32.1 | 21.4 |
| mount 1,000 rows, all bindings reactive | 60.4 | 61.3 | 71.1 |

The machine was faster in the afternoon than in the morning run above (head 12.6 against 16.0 for the same bundle content), so compare within a table only.

The probe costs reactive bindings about 5 µs each (+18% on that screen): a kept node is set up twice (the probe run, then `recompute` with a stub that re-links the recorded dependencies). Done inside `recompute` that replay would not be needed, but that is the maintainers' code to restructure. Recycle saves only the allocation and linking of the node, about a fifth of the mount, with no cost elsewhere.

Earlier claim corrected: "about 110 of 145 µs per card is creating bindings" came from micro benchmarks; removing nearly all of that cost (probe) takes 46% off the mount, so about half is the measured share.

## Addendum 2: early exit, and a better way to measure

The medians above could not resolve differences under about 20% (a later run of the same bundles put recycle level with head). Method from here on: 8 repeats of each operation per process, take the best of the 8, median over 8 processes, bundles alternated. Spread between processes is then about ±5%.

**Early exit** (`patches/spike-solid-recycle-early.patch`, recycle plus 22 lines in `recompute`): after the compute of a render effect's first pass, if the node has no dependencies, no extension, no flags, no status, nothing staged, no subscribers, and no transaction or lane is active, set the value, mark it modified and return without the tail.

JS ms (production builds of `a406a5d`, test switches compiled out; two runs where given):

| | head | recycle | recycle + early exit | probe |
|---|---:|---:|---:|---:|
| mount 5,000 nodes, all bindings static | 55.2 / 57.4 | 45.2 / 47.7 | 41.6 / 41.5 | 31.3 |
| mount 1,000 rows, all bindings reactive | 53.7 / 62.4 | 56.9 / 57.6 | 57.0 / 56.6 | 67.4 |

So: recycle −17%, with early exit −26%, probe −43% on static bindings; on reactive bindings the first two are within noise of head (the 62.4 was a noisy process group, range 53–77) and the probe is about +25%.

Tests with early exit: signals 7,263 (`PROBE_ALL=1`), universal 61, solid-js 936, web client 2,040, web hydrate 801 pass; web server as before. One hydrate test (`served-source-landing`, uses `sleep(30)`) failed once in a full run under load and passed in three reruns and a second full run. solid-fuse 65 pass.

## Addendum 3: probe with a hand-written finish for the plain case

Wytze's question: why not evaluate, see whether it is reactive, and wire the result into the effect without the replay? `patches/spike-solid-probe-fast.patch` (the probe patch plus 20 lines): after the probe run, if the node is in the plain state (no extension object, no flags beyond "recomputing", status still "uninitialized", nothing staged, no subscribers, value not an object unless the node is sync, and the probe was allowed at all, so no transaction, lane, verdict window or snapshot capture), it is finished by hand: flags and status cleared, value stored, marked modified, effect function set; `runEffect` then applies it as usual. Everything else still goes through the `recompute` replay. Not done in that plain finish compared with `recompute`: `bumpNotifyEpoch()`, the status notify for a node that never had a status, and the observe hooks (the fast finish is off when attribution hooks are installed).

Same method as addendum 2 (best of 8 per process, median of 8 processes):

| JS ms | head | recycle + early exit | probe + fast finish |
|---|---:|---:|---:|
| mount 5,000 nodes, all bindings static | 53.4 | 40.9 | 31.2 |
| mount 1,000 rows, all bindings reactive | 52.6 | 56.7 | 47.4 |

Static −42%, reactive −10%: a reactive binding in the plain state now skips most of `recompute` as well.

Tests: signals 7,263 with `PROBE_ALL=1` (fast finish 9,491 times, replay 26,244, thrown 2,578, static 30, not tried 4,712), universal 61, solid-js 936, web client 2,040 (fast finish 4,424), web hydrate 801 pass; web server as before (one failure with and without). solid-fuse 65 pass.

## Addendum 4: the same bundles on V8 (JIT)

Node 22 (`perf_bench-main/tools/jit.mjs`: loads the bench bundle with a stub `fjs.bridge_call`, 30 mounts of 5,000 nodes per process, 12 processes per bundle). Bundles: `head`, `recycle` (spare only), `fast` (probe + fast finish).

| | head | recycle | fast |
|---|---:|---:|---:|
| first mount in a fresh process (cold), ms, median [range] | 11.6 [10.9–19.1] | 11.0 [9.8–13.1] | 9.5 [7.8–13.0] |
| warm mount, best of mounts 11–30, ms | 1.37 | 1.48 | 1.29 |
| warm reactive screen, best, ms | 1.49 | 1.53 | 1.40 |
| JS heap retained by one mounted 5,000-node screen, KB (after gc) | 2,060 | 741 | 741 |

Warm, the JIT makes all three the same. Cold, the fast version is about 18% faster; recycle is within the spread. The heap is the clear difference: the screen has 2,275 static bindings (455 cards × 5), and not keeping an effect for each saves about 1,320 KB, about 580 bytes per binding, 64% of what this screen retains on the JS side. That holds on any engine.

## Addendum 5: a first-pass path inside Solid (the S.js shape)

Patch: `patches/spike-solid-first-pass.patch`, against `solidjs/solid` main `a406a5d`. This replaces the bolted-on probe with a change to how a render effect is born.

Shape:

- A render effect that runs on creation is created **unlinked** (`createEffectNode(..., unlinked)`). Nothing has to be unhooked later.
- `firstPass(node)` in `core.ts` runs the body once on that node. In a quiet world (no hold, lane, snapshot or observer) it opens a small frame itself. Otherwise it links the node and calls the general `recompute`.
- After the body: nothing recorded means the effect does not exist, the value is applied and the node is kept as the spare. A plain outcome means the node is linked and published in four assignments. Anything else is linked and handed to `recompute(node, true, ran)`, which finishes a pass whose body already ran (six small edits in `recompute`, no stub function).
- "Nothing recorded" is one counter (`touches`, bumped by `read`, `getOwner`, `getObserver`) plus empty child, cleanup and context checks. No `probing` flags.
- On for every render effect without `defer`/`schedule`, not only compiler bindings.

Tests (path on by default): signals 7,263, universal 61, solid-js 936, web client 2,040, web hydrate 801 pass; web server 2,226 of 2,227 (the same adapter test that fails on unpatched main). Path counts in the signals suite: resumed 28,674, plain 9,492, general 4,843, static 30.

QuickJS, best of 8 per process, median of 8 processes, JS ms:

| | main | probe + fast finish | first pass | first pass, no spare |
|---|---:|---:|---:|---:|
| mount 5,000 static | 54.0 | 30.7 | 31.1 | 38.7 |
| mount 1,000 reactive rows | 52.9 | 47.4 | 44.7 | 44.5 |

V8 (Node 22, 12 processes): cold first mount 11.5 / 8.4 / 8.9 ms, warm 1.34 / 1.26 / 1.26, heap of the mounted screen 2,060 / 741 / 741 KB.

The spare is an optimisation worth about 7.5 ms of the 23 ms gain; the design works without it.

Not done: dev-tools `onOwner` now fires when a node is kept, after its children's; memos still take the general first pass.
