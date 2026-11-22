# solid-fuse (monorepo)

This is the **solid-fuse framework repo**, not a consumer app. solid-fuse runs SolidJS 2.0 inside Flutter via QuickJS (`fjs`), rendering native Flutter widgets from a reactive component tree.

> **fjs is vendored in-tree**, not a package dependency: `packages/solid-fuse/dart/lib/src/fjs` is a git-subtree mirror of `wytzepiet/fjs`, and `solid_fuse` is itself the FFI plugin that builds it. Don't add a `fjs` dependency or call `LibFjs.init()` directly (use `initFjs()`). Sync with `make sync-fjs`. See `notes/vendoring-fjs.md`.

## Before changing anything

User-facing behaviour (APIs, JSX elements, config, runtime lifecycle, widgets, controllers, channels, navigation) is documented in `packages/docs/content/docs/`. **Read the relevant topic there before changing it** — that's the source of truth for how the framework is supposed to work.

When you change framework behaviour, **update the corresponding doc in the same change**. Docs and code ship together; drifted docs are worse than no docs.

Solid 2.0 reference: read the vendored mirror at `packages/solid-fuse/vendor/solid-2.0-docs/` (upstream: https://github.com/solidjs/solid/tree/next/documentation/solid-2.0). Refresh it with `bun run sync-solid-docs` when Solid updates; it ships to consumers in `dist/docs/solid-2.0/`.

## Repo layout

```
packages/
  solid-fuse/      ← the npm package (JS + Dart + CLI)
    src/           ← JS source: custom Solid renderer, polyfills, channels
    dart/          ← Dart package: FuseRuntime, FuseView, widget builders
    cli/           ← `fuse link` / `fuse dev` / `fuse build`
    dist/          ← Vite build output (published)
  docs/            ← Fumadocs site — source of truth for user-facing behaviour
examples/
  demo/            ← local demo app
```

## Internal patterns (not in user docs)

- **Don't manually drain jobs or call `runtime.idle()` after running user code.** fjs's internal background driver (started by `engine.init()` since fjs 3.x) pumps async event-driven, and fjs notifies it after every foreground call. Manual draining (the old `drainImmediateJobs` loop) evicts the driver's single-slot scheduler waker, stalling detached `fetch`/timers until an unrelated event; `idle()` deadlocks on long-lived Promises (the WebSocket).
- **JSX goes through two compilers.** `cli/compile-plugin.ts` runs first: it compiles the pass-through wrappers (`View`, `Text`, ...) as their elements and lifts constant JSX into templates, leaving `<h$tag $t $i>` elements for the dynamic places. Solid's compiler then handles those as ordinary elements. The plugin must only decide what is constant; anything about how dynamic JSX behaves belongs to Solid's compiler. `cli/compile-plugin.test.ts` compares every fixture with and without the step, and `dart/test/template_ops_test.dart` replays its recorded batches (`UPDATE_FIXTURES=1 bun run test` after a change to the ops).
- **Node lifetime is the JS garbage collector's.** `remove` only detaches; `dispose` is journalled when JS lets go of a node (`released` in `src/renderer.ts`). Don't dispose on the Dart side on your own.
- **Core Dart imports `package:flutter/widgets.dart`, never `package:flutter/material.dart` or `cupertino.dart`** (deprecated since Flutter 3.47; frozen copies whose types differ from the `material_ui` / `cupertino_ui` pub packages). Material widgets (`textField`, `materialPage`) import `package:material_ui/material_ui.dart`.
- The `solid-fuse` dist is an ESM bundle with `solid-js` and `@solidjs/universal` externalised — Vite in consumer apps resolves them to its pre-bundled deps at serve time.
- `fuse dev` / `fuse build` auto-configure `@solidjs/vite-plugin` with `generate: "universal"` and `moduleName: "solid-fuse"` — consumer apps don't need their own `vite.config.ts`.

## Development

```bash
# JS package
cd packages/solid-fuse
bun run build         # vite → dist/

# Dart package
cd packages/solid-fuse/dart
flutter test
flutter analyze
```

### Fast rebuilds

Set `CARGO_TARGET_DIR` (cloud: `/opt/cargo-target`, set by `scripts/cloud-setup.sh`) so every app shares one Rust build of fjs instead of rebuilding it per app and per `flutter clean`. Numbers and rules of thumb: `notes/fast-iteration.md`.

### Pushing changes to consumers

solid-fuse is consumed via `yalc` in external apps (e.g. `pole-goals/app_2`). After changing JS or Dart:

```bash
cd packages/solid-fuse
bun run build         # if JS changed
yalc publish --push   # pushes to every consumer that ran `yalc add solid-fuse`
```
