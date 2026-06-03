# polyfill_tests

Integration tests for solid-fuse polyfills and the renderer, run against the
macOS desktop target (where real SolidJS 2.0 reactivity runs truthfully — it's
inert in bun).

## Running

```bash
flutter test integration_test/<name>_test.dart -d macos
```

## Sliver suite test

`integration_test/slivers_test.dart` exercises the sliver widgets + core
protocol changes (array-of-nodes props, awaitable callbacks) end to end. Unlike
the other tests it boots the **real renderer**: it evaluates a self-contained
SolidJS IIFE bundle inside the QuickJS engine, wires it to a `FuseRuntime` via
`FuseRuntime.connectForTesting`, and asserts against the native Flutter widget
tree that `FuseView` renders.

The JS half lives at `../demo/src/sliver-test-entry.tsx`. Rebuild the bundle
(`assets/js/sliver_bundle.js`) whenever that entry — or any sliver JS widget —
changes:

```bash
# from the solid-fuse package dir (where vite resolves)
cd ../../packages/solid-fuse
FUSE_REPO_ROOT="$(git rev-parse --show-toplevel)" \
  bun ../../examples/polyfill_tests/tool/build_sliver_bundle.ts
```

---

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
