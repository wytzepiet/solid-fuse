# Spec: Multiple engines

**Status:** intended capability, NOT yet verified. Treat as a design target, not a
description of working behaviour.

solid-fuse's API is engine-instance-based (`createEngine` returns an instance),
but multi-engine has **never been tested** with N>1 engines actually running side
by side. The Dart side is now fully engine-owned (see "Dart side"). Rule we're
holding ourselves to: **either it's tested or it's not supported.** This note
captures *why* we want to keep it, so the work to make it real is justified and
scoped.

## Why keep it (use cases)

1. **Incremental adoption / multiple JS-backed surfaces — the headline.**
   Different parts of one Flutter app are independently solid-fuse-powered, each
   its own engine with its own JS bundle. Enables:
   - independently shipped/versioned/OTA-updated bundles per surface;
   - converting a native app to solid-fuse **one screen at a time** (no big-bang
     rewrite) — a framework-defining adoption story;
   - team/codebase isolation (separate dep trees, can't break each other);
   - fault isolation (one surface's JS error/HMR failure doesn't kill the others).

2. **Worker engine (off-thread compute).** fjs runs each engine on its own
   isolate thread, so heavy JS (parsing, crypto, sync/recommendation loops) runs
   in a second engine without dropping UI frames on the rendering engine.

3. **Untrusted/third-party JS sandbox.** Render a plugin/extension's UI in an
   isolated engine — own globals, no access to app JS state, killable alone.

4. **Lifecycle/memory scoping.** A heavy modal/flow gets its own engine, fully
   torn down (memory reclaimed) on dismiss.

#1 and #2 justify the capability; #3/#4 fall out for free.

## What already works (the easy half)

The **JS side is already multi-engine-safe**: each engine is its own QuickJS
context with its own `globalThis`, and the solid-fuse bundle is evaluated
per-context. So `__dispatch`, the renderer's `ops`/`root`/`handlers`, and the
`console`/`WebSocket`/`URL` polyfills are automatically per-engine. The renderer
needs no changes to support N engines.

## Dart side (resolved — all engine-owned)

The Dart side no longer has any module-level singletons. Each engine owns its
whole lifecycle:

- **Job pump** — each engine drives itself via fjs's background driver
  (`engine.startDrive()` / `stopDrive()`), so N engines pump independently.
- **Teardown** — `retireEngine` does a real teardown (stop driver, remove
  brightness observer, dispose WebSockets, `close()` the runtime), so HMR no
  longer leaks — the old `retiredEngines` keep-alive list is gone, and fjs fixed
  the drop-without-close SIGABRT (#8) that forced it.
- **Brightness observer** — one `_FuseBrightnessObserver` per engine, added to the
  binding in `createEngine` and removed in `retireEngine`. It forwards OS
  light/dark changes to its own engine's channels, so every live engine gets the
  update (the old global retargeted to only the newest engine). Single-engine apps
  are unaffected — they just have one.

## To actually claim support (definition of done)

1. ~~Make the brightness observer engine-owned~~ — done; the driver, WebSockets,
   brightness observer, and runtime teardown are all engine-owned (see
   `createEngine` / `retireEngine`).
2. A test app in `examples/` running **two engines** with **different JS
   bundles** in one Flutter app, both interactive, proving isolation:
   - independent rendering/state (no cross-talk via globals);
   - both job-pumped (fetch/timers work in both concurrently);
   - one can be disposed without affecting the other;
   - (stretch) a worker engine doing heavy compute without janking the UI engine.
3. Brightness/lifecycle events reach all live engines.
4. Decide + document the threading model expectation (per-engine isolate) and any
   shared-resource limits.

## Until then

Pole Goals runs a single engine. The async-driver fix is now fjs-side and
per-engine (`engine.startDrive()`/`stopDrive()`; see the fjs `drive()` re-arm),
and `retireEngine` tears engines down for real. All Dart lifecycle is now
engine-owned; the one piece left for true multi-engine is actually verifying N>1.
