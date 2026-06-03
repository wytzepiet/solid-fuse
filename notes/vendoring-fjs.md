# Vendoring fjs into solid_fuse

solid_fuse **is** the FFI plugin that builds the QuickJS-via-Rust engine. It no
longer depends on the `fjs` package — fjs is vendored in-tree and solid_fuse
compiles it directly. This kills the old pub-cache git-dependency layer that
caused stale-build / wrong-commit pain (lock pinned one fjs commit, the cache
checked out another).

The fjs **repo** still exists and is still where you make changes / upstream PRs
— see [`fjs-fork.md`](./fjs-fork.md) for the branch model. Vendoring only changes
how solid_fuse *consumes* it: a synced copy, not a dependency.

## Layout

The whole fjs repo is vendored via **git subtree** at:

    packages/solid-fuse/dart/lib/src/fjs/      <- prefix (mirror of wytzepiet/fjs @ solid-fuse)

Under `lib/` (not `native/`) on purpose: Dart only lets you `import
'package:solid_fuse/…'` from `lib/`, and the fjs bindings (`lib/src/fjs/lib/`)
must be importable. Rust under `lib/` is unconventional but fine — cargokit
builds from any path and pub ships arbitrary files. The analyzer excludes the
vendored tree (`analysis_options.yaml`).

What solid_fuse adds around the vendored copy:

| Piece | Where | Why |
|---|---|---|
| Plugin declaration | `pubspec.yaml` `flutter.plugin.platforms` (ffiPlugin, ×5) | makes solid_fuse the FFI plugin |
| Platform build glue | `ios/ macos/ android/ linux/ windows/` (package root) | podspec/gradle/cmake copied from fjs, repathed to `../lib/src/fjs/{cargokit,libfjs}`, plugin renamed `fjs`→`solid_fuse` |
| API re-export | `lib/fjs.dart` → `export 'src/fjs/lib/fjs.dart'` | exposes the runtime as `package:solid_fuse/fjs.dart` |
| Library loader | `lib/src/fjs_loader.dart` `initFjs()` | see below |

The Rust crate's lib name stays **`fjs`** (cargokit `libname`, `libfjs.a/.so`) —
that's what frb's symbol loader expects, so don't rename it.

## The loader (`initFjs`)

frb's generated loader has `stem: 'fjs'`, so on Apple it opens
`fjs.framework/fjs`. That framework no longer exists — the Rust static lib is
force-loaded into **`solid_fuse.framework`** now. So `initFjs()`:

- **iOS/macOS:** `ExternalLibrary.process()` — symbols are in the process (static
  force_load), so we bypass the framework-name assumption entirely.
- **else:** default loader — cargokit bundles a dynamic `libfjs.{so,dll}` that
  frb opens by the `fjs` stem.

All FFI init goes through `initFjs()` (`FuseRuntime.create`, tests). Never call
`LibFjs.init()` directly.

## Syncing with upstream fjs

**Source of truth is the fjs repo.** Edit Rust there, then pull into solid_fuse.
The vendored copy is effectively generated; don't hand-edit it for real work.

    make sync-fjs    # git subtree pull  (bring fjs solid-fuse branch in)
    make push-fjs    # git subtree push  (send vendored-copy edits back — rare)

⚠️ **The root platform folders are a manual fork.** `sync-fjs` updates
`lib/src/fjs/` (including `cargokit/`, which carries the heavy build logic) but
**not** the root `ios/ macos/ android/ linux/ windows/` shims. Those are ~10
lines of stable boilerplate that just point at cargokit, so they rarely change —
but after a `sync-fjs`, if fjs altered its own podspec/gradle/cmake (e.g. new
cargokit args or a new platform), port that change into the root shims by hand.

## Validated

macOS: `engine_lifecycle` (1/1) and `channels_roundtrip` (10/10) pass — cargokit
compiles the vendored Rust and the engine runs. iOS/Android/Linux/Windows use the
identical path pattern but haven't been built yet.

## Before publishing to pub.dev (not done yet — pre-alpha)

- **`.pubignore`** to drop vendored cruft (`lib/src/fjs/{example,test_driver}`,
  the dup platform folders, READMEs, nested pubspec). ⚠️ creating `.pubignore`
  makes pub ignore `.gitignore`, so re-add `build/`, `**/target/`, `.dart_tool/`.
  Keep `lib/src/fjs/{libfjs,cargokit,lib,LICENSE}`.
- **Precompiled binaries** so consumers don't need a Rust toolchain: cargokit
  keypair + a GitHub Actions matrix uploading signed artifacts to solid_fuse's
  releases; point `cargokit.yaml` `url_prefix` at this repo. (cargokit content-
  addresses by source hash, so a downloaded binary can't be stale.)
- Bump solid_fuse version; the vendored fjs commit is frozen by the subtree, so
  a solid_fuse version maps to exactly one fjs commit.
