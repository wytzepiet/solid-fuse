# solid-fuse (monorepo)

This is the **solid-fuse framework repo**, not a consumer app. solid-fuse runs SolidJS 2.0 inside Flutter via QuickJS (`fjs`), rendering native Flutter widgets from a reactive component tree.

> **fjs is a published dependency** (`fjs: ^3.0.0` on pub.dev) — the FFI plugin that builds and ships the Rust/QuickJS engine. solid_fuse is a plain Dart package that re-exports it via `lib/fjs.dart`. Call `initFjs()` (not `LibFjs.init()` directly) so library loading stays idempotent. The `wytzepiet/fjs` fork (`~/github/fjs`) is dormant — used only to raise upstream PRs; see `notes/fjs-fork.md`.

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

- **Don't manually drain jobs or call `runtime.idle()` after running user code.** As of fjs 3.0 the async runtime owns its background driver internally (event-driven scheduler wakes + a 1s defensive fallback) and starts it automatically — app code never starts, stops, or polls it. Manual draining stalls detached `fetch`/timers; `idle()` deadlocks on long-lived Promises (the WebSocket). To *observe* unhandled background JS failures without failing an unrelated call, use `engine.drainUnhandledJobErrors()`.
- The `solid-fuse` dist is an ESM bundle with `solid-js` and `@solidjs/universal` externalised — Vite in consumer apps resolves them to its pre-bundled deps at serve time.
- `fuse dev` / `fuse build` auto-configure `vite-plugin-solid` with `generate: "universal"` and `moduleName: "solid-fuse"` — consumer apps don't need their own `vite.config.ts`.

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

### Pushing changes to consumers

solid-fuse is consumed via `yalc` in external apps (e.g. `pole-goals/app_2`). After changing JS or Dart:

```bash
cd packages/solid-fuse
bun run build         # if JS changed
yalc publish --push   # pushes to every consumer that ran `yalc add solid-fuse`
```
