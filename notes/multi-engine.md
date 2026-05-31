# Spec: Multiple engines

**Status:** intended capability, NOT yet verified. Treat as a design target, not a
description of working behaviour.

solid-fuse's API is engine-instance-based (`createEngine` returns an instance;
`retiredEngines` holds several), but multi-engine has **never been tested** and
some Dart-side services assume a singleton (see "Known incoherence"). Rule we're
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

## Known incoherence (the hard half — Dart side)

Dart-side services are **module-level singletons** that assume one engine:

- `_fuseBrightnessObserver` — single global, retargets to latest engine.
- the job pump (the `executePendingJob` poller; see `engine.dart`) — same: a
  single global timer that drives one engine. With multiple live engines it would
  only drive the last one. This is also why HMR currently leaks
  (`retiredEngines` keeps old engines alive but a single global service can't
  serve all of them).
- `retiredEngines` exists *because* there's no real per-engine `dispose()` — HMR
  creates new engines without tearing down old ones (GC/SIGABRT workaround).

**Resolution direction:** make lifecycle services **engine-owned**, not module
statics — the pump and brightness observer become fields created in
`createEngine` and torn down in a real `dispose()`. Then:
- multi-engine works (each engine drives/observes itself);
- HMR stops leaking (retire → `dispose()`), likely letting `retiredEngines` go;
- single-engine apps are unaffected (they just have one).

This is the same refactor whether we keep multi-engine or not — engine-owned
lifecycle + real dispose is correct either way. Keeping multi-engine just means
we *also* verify N>1.

## To actually claim support (definition of done)

1. Engine-owned lifecycle services (pump, brightness observer) + real
   `dispose()`; drop/justify `retiredEngines`.
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

Pole Goals runs a single engine. The immediate job-pump fix (see `engine.dart`
"A" implementation + the fjs `drive()` issue) is written as a module-level
singleton matching today's pattern — consistent with current code, to avoid
half-migrating architecture mid-bugfix. The engine-owned-lifecycle refactor
above is the deliberate follow-up that makes multi-engine real.
