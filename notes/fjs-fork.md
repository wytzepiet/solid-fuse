# fjs

solid-fuse runs on [fjs](https://github.com/fluttercandies/fjs) (QuickJS-via-Rust
engine). We consume it as a **published pub.dev dependency** (`fjs: ^3.0.0`) —
the FFI plugin that builds and ships the engine. solid_fuse is a plain Dart
package; it re-exports the runtime via `lib/fjs.dart` and initialises it through
`initFjs()` (a thin idempotent wrapper around `LibFjs.init()`).

This replaced an earlier **soft fork** (`wytzepiet/fjs`, vendored in-tree via git
subtree) that we maintained while we needed fixes upstream hadn't shipped yet:
the drop-without-close crash, JS stack safety, the async driver, and real error
surfacing. fjs **3.0.0** absorbed equivalents of all of them, so the fork's
patches became redundant and the vendoring (subtree, cargokit build glue, the
duplicated platform shims, the `initFjs` force-load hack) is gone.

## The fork is dormant

`~/github/fjs` (`wytzepiet/fjs`) still exists and is still where we'd raise
upstream PRs, but we no longer depend on it. Branch model if we ever need it
again:

- **`main`** — mirrors `upstream/main` exactly.
- **`feat/*`** — one per change, branched off `main`; clean additive commits
  suitable for a cross-fork PR
  (`gh pr create --repo fluttercandies/fjs --base main --head wytzepiet:feat/<name>`).

## If we need an unreleased fjs fix before it's published

Don't re-vendor. Point the dependency at the fork's git ref temporarily:

```yaml
dependencies:
  fjs:
    git:
      url: https://github.com/wytzepiet/fjs.git
      ref: <branch-or-sha>
```

A git dependency stays a real FFI plugin (it builds its own framework and ships
its own cargokit binaries), so none of the old vendoring machinery comes back.
Switch back to a pub version (`fjs: ^x.y.z`) once the fix is released.

Native (Rust) changes need a **full app restart** (not hot reload); the first
build after a version bump may recompile the crate if no precompiled binary
matches the crate hash.
