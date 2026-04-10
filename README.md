# Solid Fuse

Build native apps with SolidJS and Flutter. Reactive JSX components rendered as real widgets.

```
SolidJS JSX  →  QuickJS  →  Rust FFI  →  Flutter  →  Impeller
 your code      runtime      bridge      widgets      pixels
```

No webview, no bridge serialization. Signals propagate directly to native Flutter widgets. Events flow back as function calls. One reactive loop, two ecosystems.

**[Visit the website](https://solid-fuse.dev)** | **[Read the docs](https://solid-fuse.dev/docs)**

## Quick start

```bash
bunx create-solid-fuse my-app
cd my-app
bun dev
```

### Project structure

```
my-app/
  src/
    App.tsx              # SolidJS entry point
  dart/
    lib/main.dart        # Flutter entry point
  fuse.config.ts
  package.json
```

### TypeScript side

```tsx
import { createSignal } from "solid-js";

export default function App() {
  const [count, setCount] = createSignal(0);

  return (
    <view flex={{ align: "center", justify: "center", expand: true }}>
      <text fontSize={48} fontWeight="bold">
        {count()}
      </text>
      <gestureDetector onTap={() => setCount((c) => c + 1)} />
    </view>
  );
}
```

### Dart side

```dart
import 'package:flutter/material.dart';
import 'package:solid_fuse/solid_fuse.dart';
import '_generated/fuse_packages.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);

  runApp(MaterialApp(
    home: FuseView(runtime: runtime),
  ));
}
```

## How it works

JSX elements like `<view>`, `<text>`, and `<gestureDetector>` map to registered Flutter widgets. The Solid compiler (configured automatically) transforms JSX into calls to a custom renderer built on `@solidjs/universal`. Every mutation — create node, set prop, insert child — is recorded in an ops journal and flushed to Dart in a single FFI call via QuickJS. On the Dart side, `FuseRuntime` applies the ops, and Flutter's `ListenableBuilder` rebuilds only the affected widgets.

Events flow back: Flutter gesture handlers call into JS, which triggers SolidJS signal updates, producing new ops. The cycle is seamless — signals in, widgets out.

### Dev vs production

- **`bun dev`** starts Vite + Flutter together. Dart connects to the Vite dev server via WebSocket for hot module replacement.
- **`bun build`** produces a single IIFE bundle loaded from Flutter assets, with optional bytecode caching.

## Features

All standard SolidJS primitives work: signals, effects, memos, `Show`, `For`, `Switch`, `createContext`, etc.

### Built-in widgets

| Element | Flutter equivalent |
| --- | --- |
| `<view>` | Container, Padding, SizedBox, Opacity, Transform |
| `<text>` | Text |
| `<stack>` / `<positioned>` | Stack / Positioned |
| `<scrollView>` | SingleChildScrollView |
| `<gestureDetector>` | GestureDetector |
| `<navigator>` | Navigator 2.0 |

### Controllers

Persistent native Dart objects accessible from JS with reactive state:

```tsx
const scroll = createScrollController();

// Reactive scroll position
createEffect(() => console.log(scroll.scrollOffset()));

// Imperative control
scroll.animateTo(500, { duration: 300 });

return <scrollView controller={scroll._ref}>...</scrollView>;
```

### Channels

Fire-and-forget messaging between JS and Dart for analytics, auth, native APIs:

```tsx
// JS → Dart
send("analytics", { event: "page_view", page: "home" });

// Dart → JS
on("auth:token", (data) => setToken(data.token));
```

### Navigation

Declarative page stack backed by Flutter's Navigator 2.0:

```tsx
const nav = useNavigator();
nav.push(() => <DetailPage />);
nav.pop();
```

## Extensibility

Fuse is designed to be extended. Register custom widgets, controllers, and page types — in your app or as reusable npm packages.

### Custom widget in 3 steps

**1. Declare the JSX type:**
```ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      badge: { label: string; color?: ColorInput };
    }
  }
}
```

**2. Write the Dart widget:**
```dart
class FuseBadge extends StatelessWidget {
  const FuseBadge({super.key, required this.node});
  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final label = node.string('label') ?? '';
    final color = node.color('color') ?? Colors.blue;
    return Chip(label: Text(label), backgroundColor: color);
  }
}
```

**3. Register:**
```dart
runtime.registerWidget('badge', FuseBadge.new);
```

### Fuse packages

Reusable packages ship both JS and Dart. Add a `fuse.config.ts` and `fuse link` generates the Dart glue code automatically.

```ts
// fuse.config.ts
import { defineConfig } from "solid-fuse/config";
export default defineConfig({ register: "MyPackage" });
```

## CLI

| Command | Description |
| --- | --- |
| `fuse dev` | Start Vite + Flutter with HMR |
| `fuse build` | Production build |
| `fuse link` | Scan packages, generate Dart glue code |

## Status

Early preview. The API is evolving.

## License

MIT
