# Fuse

Fuse is a framework that runs [SolidJS 2.0](https://www.solidjs.com/) inside Flutter via an embedded JavaScript engine (QuickJS through [`fjs`](https://pub.dev/packages/fjs)), rendering native Flutter widgets from a reactive SolidJS component tree.

## How it works

```
SolidJS JSX → custom renderer (ops journal) → bridge_call → Dart → Flutter widgets
```

SolidJS components use JSX with intrinsic elements (`<view>`, `<text>`, `<gestureDetector>`) that map to Flutter widgets. A custom `createRenderer` from `@solidjs/universal` translates the virtual tree into an ops journal (create, insert, remove, setProp, setText). Ops are flushed to Dart via `fjs.bridge_call`, where the Dart runtime materialises them as Flutter widget trees.

Events flow back: Flutter gesture handlers call `globalThis.handleEvent(nodeId, event)` in JS, which triggers SolidJS signal updates, producing new ops.

## Package structure

`packages/solid-fuse/` is a single npm package shipping both JS and Dart:

```
packages/solid-fuse/
  src/          ← JS source (SolidJS custom renderer, polyfills, channels)
  dart/         ← Dart package (Flutter runtime, widgets, connections)
  cli/          ← CLI source (fuse link)
  dist/         ← JS build output
  package.json  ← npm: solid-fuse
```

### JS runtime (`src/`)
- Custom SolidJS renderer and polyfills (structuredClone, WebSocket bridge)
- Built with Vite (`bun run build` → `dist/`)
- Exports renderer primitives (`render`, `insert`, `createComponent`, `createElement`, etc.) that the Solid JSX compiler imports via the `moduleName` config
- External deps: `solid-js`, `@solidjs/universal`

### Dart runtime (`dart/`)
- `FuseRuntime` / `FuseView` — widget tree materialisation and event dispatch
- `FusePackage` — abstract base class for registering widgets; `SolidFuse` is the built-in implementation
- `DevServerConnection` — connects to Vite dev server, pre-fetches ES modules, evaluates in QuickJS, supports HMR
- `QuickJsConnection` — production mode, loads pre-built bundle from assets (with bytecode caching)
- `FuseWsManager` — bridges JS WebSocket calls to Dart `web_socket_channel`
- Widget builders for `view`, `text`, `gestureDetector`, `navigator`, `scrollView`, `stack`

### CLI (`cli/`)
- `fuse link` — scans `node_modules` for packages with a `"fuse"` field, generates `pubspec_overrides.yaml` and `lib/_generated/fuse_packages.dart`
- Built with Bun + Citty

## Key patterns

- **No `runtime.idle()`** after evaluating user code. Long-lived JS Promises (e.g. WebSocket connections) would deadlock since they depend on Dart bridge events. Use `drainImmediateJobs` (loops `executePendingJob`) instead.
- Consumer apps configure `vite-plugin-solid` with `moduleName: "solid-fuse"` so the JSX compiler imports renderer primitives from this package.
- The `solid-fuse` dist is an ESM bundle with `solid-js` and `@solidjs/universal` externalised — Vite resolves them to its pre-bundled deps at serve time.

## FusePackage convention

Packages (including solid-fuse itself) declare a `"fuse"` field in `package.json`:

```json
{
  "fuse": {
    "register": "SolidFuse"
  }
}
```

- `register` (required) — class name extending `FusePackage`
- `dart` (optional) — path to Dart package directory, defaults to `"dart"`

The `fuse link` CLI reads this field, generates Dart glue code that imports each package and calls `register(runtime)`.

## FuseRuntime API

`FuseRuntime` uses an async factory (no singleton):

```dart
import '_generated/fuse_packages.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);

  runApp(MaterialApp(home: FuseView(runtime: runtime)));
}
```

- `FuseRuntime.create()` — spins up the JS engine, connects to dev server or loads bundle
- `FuseView(runtime: runtime)` — renders the JS tree, wraps children in `FuseRuntimeScope`
- `FuseRuntimeScope.of(context)` — widgets access the runtime from the widget tree

## Adding widgets

Fuse is extensible — widgets can live in the solid-fuse library (core primitives like `view`, `text`, `scrollView`) or in third-party Fuse packages or the consuming app.

### Step 1: JS — declare the JSX element

Add the element type to `packages/solid-fuse/src/jsx.d.ts`:

```ts
interface IntrinsicElements {
  // ... existing elements ...
  scrollView: {
    children?: any;
    direction?: "vertical" | "horizontal";
  };
}
```

For app-level widgets, extend the namespace in the app's own `.d.ts` file:

```ts
declare namespace JSX {
  interface IntrinsicElements {
    videoPlayer: {
      url: string;
      autoplay?: boolean;
    };
  }
}
```

### Step 2: Dart — write the widget builder

Create a widget class that takes a `FuseNode`:

```dart
class FuseScrollView extends StatelessWidget {
  const FuseScrollView({super.key, required this.node});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final direction = node.props['direction'] as String?;
    return SingleChildScrollView(
      scrollDirection: direction == 'horizontal' ? Axis.horizontal : Axis.vertical,
      child: Column(children: node.childWidgets),
    );
  }
}
```

For stateful widgets (text input, scroll controller, etc.), use `StatefulWidget` — Flutter preserves the `State` across rebuilds since each node has a stable `ValueKey(node.id)`.

For library widgets, add the file in `packages/solid-fuse/dart/lib/src/widgets/` and register in `SolidFuse.register()`.

For third-party Fuse packages, create a class extending `FusePackage`:

```dart
class FuseAuth extends FusePackage {
  @override
  void register(FuseRuntime runtime) {
    runtime.register('authButton', FuseAuthButton.new);
  }
}
```

For app-level widgets, register directly on the runtime after packages:

```dart
final runtime = await FuseRuntime.create();
registerFusePackages(runtime);
runtime.register('videoPlayer', VideoPlayer.new);
```

### Where should a widget live?

- **In solid-fuse**: Generic Flutter primitives that any app would use (layout, input, navigation)
- **In a Fuse package**: Reusable widgets with their own dependencies (auth, maps, video)
- **In the app**: Domain-specific widgets, widgets with app-level dependencies, or highly customized components

## Development

```bash
# JS package
cd packages/solid-fuse
bun run build        # vite → dist/

# Dart package
cd packages/solid-fuse/dart
flutter test
flutter analyze

# CLI
cd packages/solid-fuse
bun cli/index.ts link    # run from a consumer app directory
```
