# experiments/

Scratch space for spikes that aren't part of the published packages. Nothing in
here is shipped, imported by `packages/*`, or covered by the docs-ship-with-code
rule in `AGENTS.md`. Each experiment lives in its own folder with a short README
saying what question it answers and how to run it.

It's deliberately **not** a bun workspace (root `workspaces` only lists
`packages/*` and `examples/*`), so experiments can't leak into the package graph.

| Experiment | Question |
| --- | --- |
| [`dart-to-ts/`](./dart-to-ts) | How far does statically scraping the Dart widget builders get us towards generating the TS prop interfaces? |
