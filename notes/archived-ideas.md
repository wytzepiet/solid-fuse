# Ideas from the archived `feat/fjs-3.0` line

Main was rebuilt from `a736e308` (June 2026) around generated widgets and
never took in the work on `feat/fjs-3.0`. That branch is preserved as
**`archive/fjs-3.0`** on GitHub. This note lists what is worth a look, for
deciding whether to bring it to main *properly*: as a fresh implementation
on today's architecture, not a cherry-pick.

Read a commit with `git show <hash>` (all are on `archive/fjs-3.0`).

Superseded, no need to look: the hand-written widgets (slivers, `PageView`,
`TabBar`, `Image`, `RichText`, `Listener`/`IgnorePointer`/`AbsorbPointer`,
`Positioned.fill`). `fuse gen` covers them from Flutter's own signatures.

## requestAnimationFrame (`d6d2ed3b`) — likely worth it

Vsync-driven `requestAnimationFrame` / `cancelAnimationFrame` polyfill, idle
gated. Dart drives it with `scheduleFrameCallback` and passes
`currentFrameTimeStamp`. Files: `dart/lib/src/raf_driver.dart`, the
`runtime.dart` hook, `src/polyfills.ts`, docs `building/animation-frames.mdx`,
demo `screens/raf.tsx`. Main has no rAF. It is the base of the animation
plan below.

Check against main: the fjs 3 background driver (AGENTS.md: never drain jobs
by hand) and how main schedules frames and ops (`syncOps`, batches).

## Animation primitives (notes, in this branch)

`animation-primitives-spec.md` is the consolidated design (signal-driven:
`createMotion`, `createSpring`, `createElapsed`); `-research`, `-ecosystem-
addendum`, `animation-prior-art`, `animation-stress-tests` are background.
Pre-implementation. Assumes rAF and the old `Color` class; on main, colors are
the generated `Color` ("one vocabulary"), so revisit the lerp helpers.

Measured on the old line (`53f1ca00`, demo `bridge_bench.dart` + `bench.ts`):
the bridge sustained 64 prop writes per frame in ~0.77 ms. Worth re-running
on main before building on that number.

## @solid-fuse/lucide (`cb626cfe`) — likely worth it

Lucide icons as font `IconData` exports, one export per glyph (tree-shaken),
plugging into the existing `Icon`. Dart side only ships the `flutter_lucide`
font. `scripts/gen-icons.ts` generates `src/index.ts`. On main, check whether
`fuse gen` over `flutter_lucide` (export it from the package's `fuse.dart`)
gives the same result with no custom script.

## @solid-fuse/heroine (`c5c6806f`, bump `673daad2`) — maybe

Spring hero transitions over pub.dev `heroine` 0.7.x: `Heroine` widget,
drag-to-dismiss, a heroine page type, a controller handle. Was the first
user of the navigator-observer hook. Signal-driven transitions were
deliberately rejected here: frame-perfect coupling to route animation must
stay in Dart. On main, much of the wrapper may now be `fuse gen` output; what
remains is the page type and the navigator observer it needs.

## Navigator: observers, two-phase pop, page disposal — check first

`f1cb855f` (navigator observers, two-phase pop, handles as classes),
`af4b5d53` → `934330f7` → `c5b1e7a9` (when to dispose a popped page's node:
keep it alive through the exit animation and the hero flight frame),
`0351796d` (page stack as a draft-first store).

Main may have solved this differently: node lifetime now follows the JS
garbage collector, `remove` only detaches, and handles are lent and counted
(AGENTS.md). Start by checking whether main shows the old bugs (a popped
page's node disposed mid-exit-animation, or during a hero flight) before
porting anything. Navigator observers are still needed by heroine.

## Also on the archive

- `bdb25ed1` / `notes/flutter-api-coverage-map.md` (in this branch): Flutter
  API coverage and roadmap, written before generation. Mostly answered by
  `fuse gen`; the non-widget gaps (AnimationController, vsync) may still hold.
- `32189eed`: one encoder/decoder for prop wire-encoding. Main redid the
  value codec; probably superseded.
