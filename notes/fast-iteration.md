# Fast build and test iteration

Measured Nov 2026 on a Claude cloud container (4 vCPU Xeon, 16 GB, Linux x64).

## Where the time goes (fresh container, before)

| Step | Time |
|---|---|
| apt packages (GTK, xvfb, clang, cmake, ninja) | 19 s |
| Flutter 3.50.1 download + extract + `precache --linux` | 80 s |
| `cargo fetch` for libfjs | 14 s |
| `bun install` / `bun run build` / `bun test` | 4 s / 4 s / 1 s |
| libfjs cold, dev profile (what `flutter test -d linux` builds) | 163 s |
| libfjs cold, release profile | 160 s (fjs crate's LTO link alone 87 s) |
| libfjs after editing one `.rs` file: dev / release | 3 s / 85 s |
| First integration test in an app (`flutter test integration_test/x -d linux`) | 167 s |
| Same test again, nothing changed | 6 s |
| All 7 polyfill integration test files | 89 s |

The Rust engine itself is not slow to rebuild once built. What hurt was that
**cargokit put cargo's target dir inside each app's `build/`**, so every
example app, the benchmark app, and every `flutter clean` rebuilt the whole
Rust dependency graph (~2.7 min each, debug and release separately), on top
of reinstalling Flutter in every fresh container.

## What we changed

1. **cargokit honours `CARGO_TARGET_DIR`** (fjs commit "cargokit: honour
   CARGO_TARGET_DIR"). Set it and every app shares one cargo cache. Unset keeps
   the old per-app behaviour. Works locally too: put
   `export CARGO_TARGET_DIR=~/.cache/solid-fuse-cargo` in your shell profile.
2. **`scripts/cloud-setup.sh`** is the cloud environment setup script: apt
   packages, Flutter, `CARGO_TARGET_DIR=/opt/cargo-target`, and a warm debug +
   release libfjs build. It runs in ~4.5 min, under the ~5 min limit for Claude
   cloud to snapshot it, so later sessions start with all of it in place.

## After

| Step | Before | After |
|---|---|---|
| Session start to Flutter + Rust ready | ~5 min of work per thread | 0 (snapshot) |
| First integration test in an app / after `flutter clean` | 167 s | 16-17 s |
| Release build of the demo app, fresh clone | ~185 s | 97 s |
| Release build again after `flutter clean`, sources untouched | ~185 s | 24 s |

The remaining 87 s on a fresh release build is the fjs crate's LTO link
(`lto = true`, `codegen-units = 1`), which cargo redoes whenever source
mtimes change (a fresh clone). A one-line `.rs` change also costs it.

## Rules of thumb for threads

- Use the debug build for correctness tests. Only benchmarks need release.
- JS-only questions don't need Flutter at all: `bun test`, and the JS-only
  render harness, run in seconds.
- Benchmark runs are slow because of noise on a shared VM, not builds: scope
  to one question and the combined result first.
