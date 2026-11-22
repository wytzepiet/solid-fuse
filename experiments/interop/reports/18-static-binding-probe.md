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
