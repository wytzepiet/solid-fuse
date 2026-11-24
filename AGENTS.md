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
  solid-fuse/      ← the npm package (JS + Dart + CLI), design-free core
    src/           ← JS source: custom Solid renderer, polyfills, channels
    dart/          ← Dart package: FuseRuntime, FuseView, widget builders
    cli/           ← `fuse link` / `fuse dev` / `fuse build`
    dist/          ← Vite build output (published)
  material/        ← @solid-fuse/material (TS source + Dart solid_fuse_material)
  cupertino/       ← @solid-fuse/cupertino (TS source + Dart solid_fuse_cupertino)
  adaptive/        ← @solid-fuse/adaptive (TS only)
  create-solid-fuse/ ← `bun create solid-fuse`: a wrapper over `fuse create` (template in solid-fuse/templates/app)
  docs/            ← Fumadocs site — source of truth for user-facing behaviour
examples/
  demo/            ← local demo app
```

## Internal patterns (not in user docs)

- **Don't manually drain jobs or call `runtime.idle()` after running user code.** fjs's internal background driver (started by `engine.init()` since fjs 3.x) pumps async event-driven, and fjs notifies it after every foreground call. Manual draining (the old `drainImmediateJobs` loop) evicts the driver's single-slot scheduler waker, stalling detached `fetch`/timers until an unrelated event; `idle()` deadlocks on long-lived Promises (the WebSocket).
- **JSX goes through two compilers.** `cli/compile-plugin.ts` runs first: it compiles the pass-through wrappers (`View`, `Text`, ...) as their elements and lifts constant JSX into templates, leaving `<h$tag $t $i>` elements for the dynamic places. Solid's compiler then handles those as ordinary elements. The plugin must only decide what is constant; anything about how dynamic JSX behaves belongs to Solid's compiler. `cli/compile-plugin.test.ts` compares every fixture with and without the step, and `dart/test/template_ops_test.dart` replays its recorded batches (`UPDATE_FIXTURES=1 bun run test` after a change to the ops).
- **`fuse build` tree-shakes the generated Dart.** Dart registers every adapter by tag, so its own tree shaker can't drop any. After bundling, `cli/gen/shake.ts` reads what survived (each generated module's `renderedExports`, looked up in `fuse/uses.json`, plus the tags and constants the compile plugin folded away) and rewrites `fuse.generated.dart` for just that. That only works while every use is an export the bundler can see: generated values are one export per member in `fuse/<package>/<Owner>.tsx`, constants are branded (`Const<N>`), and callable owners are `/* @__PURE__ */`. Keep it that way when changing emit-ts.
- **Node lifetime is the JS garbage collector's, and Flutter's.** `remove` only detaches; `dispose` is journalled when JS lets go of a node (`released` in `src/renderer.ts`). Dart then disposes it once nothing listens to it (`FuseNode.release`), so exit animations and hero flights can still draw and remount it. Don't dispose on the Dart side on your own.
- **Handles Dart hands to JS are lent and counted.** A Dart object of a handle type crosses as `{$h, t}` (`FuseNodeRegistry.lend`): the node JS created for it (`o`), or a borrowed node with a negative id, its state in `s` the first time. Dart counts every reference it sends; JS decodes every incoming value (`decodeIn`, even for calls nothing handles) and gives the count back with `_unborrow` when it collects the handle. A reference Dart builds but doesn't send (an unchanged state value) is given back on the Dart side (`_giveBack`).
- **Synchronous calls (builders) carry their ops in the reply.** `engine.callSync` blocks the Dart thread, so `_ops` messages JS sent earlier are still queued in Dart when the builder's result needs them. The reply hands over every batch Dart hasn't acknowledged plus the new one (`syncOps` in `src/renderer.ts`); batches are numbered per bundle evaluation and Dart skips the ones it has (`applyBatch`). Ops applied during a frame notify their nodes after it.
- **requestAnimationFrame runs inside the frame.** `FuseFrameClock` (`dart/lib/src/frame_clock.dart`) calls `_frame` (`src/frames.ts`) synchronously from a frame callback, before build; the reply's ops are applied there and drawn in that frame (`applyBatch` marks nodes dirty directly before the build phase). Idle-gated: JS sends `_frames` start when its queue fills, and the clock stops when a tick reports nothing queued. Measure with `examples/demo/dart/lib/frame_bench.dart`.
- **Navigation state is JS data; Flutter's Navigators only draw it.** Every page entry holds its own stacks, keyed by their first page's address (`src/navigation.ts`), from the moment it opens: `<Navigator>` only attaches to that data (`createStack`), so links and restore rebuild the tree before anything mounts, and pushes into stacks that haven't drawn wait for them. A push places by the route's `in` (the page holding its folder), then the stack whose index prefixes its address, then the active one; a covered holder gets it on the cover's stack. Each stack keeps its list in a plain array next to its signal: Solid shows a write after a flush, and one push builds on the one before it in the same tick. Dart only forwards OS links (`_link`), the launch link and saved tree (`__fuseHost`), stores saves (`_navSave`), and gives back to the active stack (`takesBack`). File routes (`cli/routes.ts`) are only codegen: `src/app/` becomes `route()` values in `fuse/routes.tsx` (`x.tsx` holds `x/` when `x/index.tsx` exists; `name@x.tsx`, `@app`), plus `FileRoutes`, which renders `src/app.tsx`. Anything a file can say, `route()` must be able to say.
- **Fakes replace a plugin's platform instance, not its messages.** `fuse gen` finds classes with a static setter of their own type (`GeolocatorPlatform.instance`) and generates a forwarding subclass per class: each member calls the JS function of its name on the fake's node, else the instance it replaced (`_Fake<Name>` / `_Fake<Name>Install` in emit-dart). `fake()` (`src/fake.ts`) creates that node and holds it from `globalThis`: a module's variables are no GC root once the bundle has run, and a collected node is disposed. `src/fakes.ts` is prepended to the entry only where fakes are on (`cli/fakes.ts`), so phone bundles, and so their shaken Dart, never have it. Static functions go through one `$statics` handle (`_FuseStatics`).
- **`dispatch` replies ride in an array.** fjs unwraps any async result that is an object with only a `value` key (its async-eval wrapper, a tested upstream contract), so the `__fuse_dispatch` shim returns `[result]` and `FuseChannels.call` takes the first element.
- **Core is design-free.** `packages/solid-fuse` imports only `package:flutter/widgets.dart` (never `material.dart` / `cupertino.dart`, deprecated since Flutter 3.47, nor the `material_ui` / `cupertino_ui` pub packages). Design lives in `packages/material`, `packages/cupertino` (Dart imports `package:material_ui/...` / `package:cupertino_ui/...`) and `packages/adaptive`. The rules every component follows are in `notes/widget-api.md`.
- **Design packages ship TS source over the generated layer.** Their `dart/lib/fuse.dart` exports the whole Flutter library; their `src/` imports `#fuse/material_ui` etc., which the *app* generates, so the app compiles them (`exports: ./src/index.ts`; Vite excludes fuse packages from pre-bundling). They type-check against `examples/demo/fuse` (tsconfig `paths`); run `fuse gen` in the demo first.
- **Core types its handle props from the app's `#fuse/flutter`** (`FocusNodeInput`, `ScrollControllerInput` in `src/types.ts`): type-only, so the built JS doesn't import it, and `dist/*.d.ts` keep `import("#fuse/flutter")` for the app to resolve. Core's own tsc maps it to `examples/demo/fuse` (run `fuse gen` there first); the declaration build maps it to `types/fuse-stub.d.ts`.
- **One vocabulary for values.** Core widgets take Flutter's generated types (`Color`, `EdgeInsetsGeometry`, `BoxDecoration`...) and read them in Dart with `node.value<T>`: `fuse gen` registers a decoder for every class a barrel names with `show` (`fuseGeneratedDecoders`). Don't add hand-written parsers; add a `@fuseShorthand` in `dart/lib/shorthands.dart` instead.
- **Generated named widget slots go through `$slot` / `$slots`** (`src/generated.ts`): a slot holds whatever JSX gave (a component's memo, a `<Show>`, a list), each read in a memo of its own. A spread's props share one effect, so a slot read there would rebuild whenever any other prop changes. Widgets with such slots are not compile-plugin intrinsics.
- **Agents drive apps through Marionette.** `FuseBinding.ensureInitialized()` installs `MarionetteBinding` in debug/profile (its `debugPrint` feeds `get-logs`); `FuseView` mounts `MarionetteDeviceConfig`; `testId` on any node is a `Semantics(identifier:)` (`node_widget.dart`). `fuse dev` saves the VM service URI to `dart/.dart_tool/fuse/drive.json`; `fuse drive` runs `marionette_cli` (same version as the app's `marionette_flutter`) with it. `--headless` = Xvfb + private dbus + keyring (`cli/headless.ts`). marionette_flutter imports `material.dart`; that's its own code, core's stays widgets-only.
- **Platform folders are Flutter's, made on demand.** `fuse create` and `fuse dev`/`fuse build` run `flutter create` for a platform in `fuse.config.ts` `platforms` (or the build target, or linux for `--headless`) whose folder is missing, and undo everything else it writes (`cli/runners.ts`). After that the folder is the app's; fuse never regenerates it.
- **Fuse packages are found through the dependency graph** (`fuseDependencies` in `cli/config.ts`), not by listing `node_modules`: bun and pnpm install a package's own dependencies (adaptive → material, cupertino) out of the app's `node_modules`.
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
