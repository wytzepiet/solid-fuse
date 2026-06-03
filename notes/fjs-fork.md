# The fjs fork

solid-fuse runs on [fjs](https://github.com/fluttercandies/fjs) (QuickJS-via-Rust
engine). We consume a **soft fork** — `wytzepiet/fjs` — so we can land fixes
immediately while upstreaming everything. Local checkout: `~/github/fjs`.

## Branch model (in the fork repo)

- **`main`** — mirrors `upstream/main` exactly. Never commit here.
- **`solid-fuse`** — our integration branch (off `main`); **this is what
  solid-fuse depends on**. Holds upstream + our merged `feat/*` patches, plus
  any fork-only files (e.g. a fork-local `cargokit.yaml` `url_prefix`). Fork-only
  files must live **only** here, never on `feat/*` (keeps PR diffs clean).
- **`feat/*`** — one per change, branched **off `main`**. Clean, additive,
  upstreamable commits only (new methods/primitives; don't change existing
  behavior or signatures). Additive changes rebase/merge cleanly.

## Making a change to fjs

1. `git checkout main && git checkout -b feat/<name>` (off main, **not** solid-fuse).
2. Implement additively. If you add a `pub async fn` to an opaque type, regen
   bindings: `flutter_rust_bridge_codegen generate` (use codegen **2.12.0** to
   match the runtime — see upstream issue #11). Expect `funcId`/`rustContentHash`
   churn in `frb_generated.*`; that's mechanical.
3. `cargo test` in `libfjs/`. Push to `origin`, open a cross-fork PR:
   `gh pr create --repo fluttercandies/fjs --base main --head wytzepiet:feat/<name>`.
4. Merge `feat/<name>` into `solid-fuse` (same commits — don't reimplement).
5. Updates later: `main` fast-forwards to upstream; `solid-fuse` rebases onto
   `main` (accepted PRs drop out as duplicates → the delta shrinks).

First landed change: `feat/job-pump-drive` → `JsEngine.startDrive()/stopDrive()`,
an event-driven background driver replacing the old 33ms `_FuseJobPump` poll
([fluttercandies/fjs#12](https://github.com/fluttercandies/fjs/pull/12)).

## How solid-fuse consumes it

**solid-fuse no longer depends on fjs as a package — it vendors the
`solid-fuse` branch in-tree via git subtree** at
`packages/solid-fuse/dart/lib/src/fjs`, and is itself the FFI plugin that builds
it. See [`vendoring-fjs.md`](./vendoring-fjs.md) for the layout, the loader, and
the `make sync-fjs` / `make push-fjs` flow. The branch model above is unchanged —
it's still where you make and upstream changes; vendoring just changes how
solid-fuse *picks them up* (a subtree pull, not `pub upgrade`).

Native (Rust) changes need a **full app restart** (not hot reload), and the
first build after a change recompiles the crate (see below).

## Native builds (cargokit) — and shipping precompiled binaries later

fjs builds its Rust lib via **cargokit**. The pub package ships Rust **source**,
not binaries. At the consumer's build time cargokit computes a `crate_hash`
(sha256 of `libfjs/**.rs` + `Cargo.toml` + `Cargo.lock` + `cargokit.yaml`) and
tries to download a prebuilt `precompiled_<crate_hash>/<target>` asset from a
GitHub Release; on 404 it falls back to a local `cargo build`.

**Today the fork always builds from source** on the dev machine: our changes
produce a `crate_hash` that has no matching release on `fluttercandies/fjs`
(where `url_prefix` still points), so it 404s and compiles locally. That's fine
while iterating — it just makes the *first* build per change slow (it compiles
rquickjs + the llrt crates for the target, e.g. `aarch64-apple-ios`; cached
after).

**Future — once we publish solid-fuse on this fork**, shipping precompiled
binaries is worth it (so app CI / contributors without a Rust toolchain build
fast):

- Generate a signing keypair → `public_key` in `cargokit.yaml` +
  `PRECOMPILE_BINARIES_PRIVATE_KEY` repo secret; point `url_prefix` /
  `GITHUB_REPOSITORY` at `wytzepiet/fjs` (**fork-only `cargokit.yaml` edit — keep
  on `solid-fuse` only**). The existing `precompile-binaries.yml` then publishes
  a `precompiled_<hash>` release per push.
- The matrix is heavy (~10 target triples; the release profile is
  `opt-level=z`+`lto`+`codegen-units=1`, i.e. size-tuned/slow). It's
  **cache-dominated** — our diffs are tiny and the rquickjs/llrt dep graph is
  identical across hash bumps — so a runner with sticky cargo/sccache caches
  (e.g. [Blacksmith](https://www.blacksmith.sh/)) + native-ARM cuts it to
  minutes. Mix Blacksmith Linux (Android/desktop) with macOS runners (Apple).
- Cheaper interim win for local first-build time: a dev cargo profile without
  `lto`/`codegen-units=1`, and/or local `sccache`.
