# Spike branches as patches

`spike-bridge.patch` and `spike-e2e.patch` are `git format-patch` exports of two local
spike branches that change framework code (renderer, runtime, CLI, vendored fjs).
Both were cut from commit `95e4e33` on `claude/project-thread-ey60h0`.

Apply either one on a fresh branch from that commit:

    git checkout -b spike/bridge 95e4e33 && git am experiments/interop/patches/spike-bridge.patch

See `../reports/05-bridge.md` and `../reports/06-e2e-fuse-add.md` for what each contains.

`spike-perf.patch` applies on top of `spike-e2e.patch` (benchmark app, keyed-reorder fix, perf hook); and the render-cost fixes; see `../reports/10-js-thread.md` and `../reports/11-render-cost.md`.
