# Spike branches as patches

`spike-bridge.patch` and `spike-e2e.patch` are `git format-patch` exports of two local
spike branches that change framework code (renderer, runtime, CLI, vendored fjs).
Both were cut from commit `95e4e33` on `claude/project-thread-ey60h0`.

Apply either one on a fresh branch from that commit:

    git checkout -b spike/bridge 95e4e33 && git am experiments/interop/patches/spike-bridge.patch

See `../reports/05-bridge.md` and `../reports/06-e2e-fuse-add.md` for what each contains.

`spike-perf.patch` applies on top of `spike-e2e.patch` (benchmark app, keyed-reorder fix, perf hook); and the render-cost fixes; see `../reports/10-js-thread.md` and `../reports/11-render-cost.md`.

`spike-coldstart.patch` applies on top of `spike-perf.patch` (startup marks, bytecode asset, prerendered first screen, baked subtrees); see `../reports/13-cold-start.md`.

`spike-templates.patch` applies on top of `spike-perf.patch` (compile-time templates: Babel plugin, runtime, Dart ops); see `../reports/12-bundle-time.md`.

`spike-dartside.patch` applies on top of `spike-templates.patch` (lean render path: merged box for view, text leaf, block list editor, lazy ScrollView); see `../reports/14-dart-side.md`.

`spike-rebase.patch` applies on `main` at 4fc0652 (benchmark app, harness and inert perf hooks ported to the updated dependencies; no optimisations); see `../reports/15-main-baseline.md`. All other spike patches predate the dependency update.
