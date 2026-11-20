# 04 — Framework architecture under Dart-to-TS code generation

Scope: how generated interop could reshape solid-fuse as a framework (source of truth, layering, `fuse add`, OTA, caching, agent DX, migration). The generator itself is in `experiments/interop/gen/`; prior art is in `03-prior-art.md`, and this report agrees with its Part 2 except where noted in section 2.

Paths are relative to `packages/solid-fuse/` unless they start with `examples/`, `notes/` or `/home/claude/wt/`. Measurements are in `experiments/interop/arch/` (see its README to reproduce).

## Summary

**Recommendation.** Make the Dart constructor signature the source of truth, and make a JSON manifest the only thing every other part reads.

- A standalone analyzer tool reads constructors (Flutter, pub packages, and plain Flutter widgets in the app's own `dart/lib/`) and emits one manifest. TS types, Dart adapters, dev-mode validators, docs and the OTA fingerprint are all generated from that manifest.
- The Dart "escape hatch" becomes an ordinary Flutter widget with typed constructor parameters. The author no longer touches `FuseNode`; the generated adapter does the decoding.
- The native surface is an explicit allow-list per package in `fuse.config.ts`, not "everything" and not "whatever JS imports".
- Names stay on the wire. No positional props, no constructor interpreter.
- The existing `registerWidget(type, FuseNode -> Widget)` API and the existing built-ins stay as they are; everything is additive.

**On Wytze's hypothesis.** It holds in part.

- What holds: about 60% of the Dart files added under `widgets/` on the `slivers` branch (23 of 39, counting two shared support files among the 39) are pure prop-forwarding and would need no hand-written Dart and no native rebuild against a host that already registered them.
- What limits it: JS runs on its own thread and every Dart-to-JS call is asynchronous, so nothing that returns a value synchronously to Flutter (builders, validators, delegates, `Theme.of`) can be generated 1:1. Those keep needing a hand-written pattern.
- What is missing regardless of codegen: there is no OTA today. The release bundle is loaded only from Flutter assets (`dart/lib/src/quickjs_connection.dart:41`), so every JS change is a native rebuild in release. The OTA loader and a compatibility contract are separate work that codegen makes safe, not work that codegen replaces.
- Cost of a broad host: registering all of widgets + material + cupertino grows `app.so` from 6.4 MB to roughly 16 MB on arm64 (about +3 MB compressed per ABI). Acceptable for a dev client, not as a default for shipped apps.

**Smallest valuable first step.** `fuse gen` for plain Flutter widgets in the app's own `dart/lib/` and one pub package, emitting into `_generated/` and registering through the existing API. It removes double authoring for new work and changes nothing at runtime.

## Facts about the current code that drive the design

1. **The bridge is asynchronous in both directions and JS is on another thread.** JS to Dart is `fjs.bridge_call` (`src/channels.ts:27-29`); Dart to JS is `engine.call(...)` returning a Future (`dart/lib/src/channels.dart:39-49`). Callbacks are fire-and-forget: `node.callback()` sends `_functionCall` and returns nothing (`dart/lib/src/node.dart:154-157`, `dart/lib/src/runtime.dart:161-167`). The `slivers` branch adds an awaitable variant, `asyncCallback` over `_functionCallAsync`. Nothing can return a value to Flutter inside `build`.
2. **The wire is name-keyed and untyped.** Ops are `create / setProp / setText / insert / remove / dispose` (`src/renderer.ts:31-37`), applied in `applyOps` (`dart/lib/src/runtime.dart:170-228`). Props are decoded lazily on every build through `FuseMap` accessors (`dart/lib/src/node.dart:29-63`), and the JSX namespace is `[name: string]: any` (`src/jsx.d.ts:9-11`).
3. **Prop kinds are implicit conventions.** A function prop is sent as the value `true` (`src/renderer.ts:115-118`) and recognised by `props[name] == true` (`dart/lib/src/node.dart:155`), so a real boolean `true` is indistinguishable from a callback. A node or handle prop is `{_node: id}` (`src/renderer.ts:120-131`, `dart/lib/src/runtime.dart:198-205`). The `slivers` branch added a third convention (arrays of `{_node}`) by editing the renderer and `applyOps`. Each new kind is currently a protocol change by hand.
4. **Coercion lives in Dart.** `parseColor` accepts names, 3/6/8-digit hex and RGB/HSL maps (`dart/lib/src/utils.dart:34-85`); `parseEdgeInsets` accepts a number or a map (`:87-113`). It re-runs for every prop of a node whenever any prop of that node changes.
5. **Handles are stringly typed RPC.** `FuseHandle.call(String method, dynamic value)` (`dart/lib/src/fuse_handle.dart:22`), dispatched by a `switch` per handle (`dart/lib/src/handles/scroll_controller.dart:20-37`), with a matching hand-typed TS wrapper (`src/scroll-controller.ts:11-28`).
6. **Registration is a flat last-wins map, fixed before start.** `registerWidget` and `registerHandle` write into two maps (`dart/lib/src/runtime.dart:35-36, 51-60`) with no collision check; `fuse link` generates one call per npm package (`cli/link.ts:89-122`).
7. **`fuse link` already owns a generated directory and the pubspec.** It writes `dart/lib/_generated/fuse_packages.dart` and `pubspec_overrides.yaml`, and adds or removes `# fuse-managed` dependencies (`cli/link.ts:36-53`, `cli/utils.ts:150-165, 230-254`). The demo commits both generated files. `pubspec.lock` is gitignored at the repo root.
8. **Release loading and the bytecode cache.** The bundle comes from `rootBundle` only (`dart/lib/src/quickjs_connection.dart:41`). The cache is a single slot keyed by `sha256(bundle source)` alone (`dart/lib/src/bytecode_cache.dart:10-11, 21-32, 54-55`). The key does not include the QuickJS/fjs version, so an app update that changes fjs but not the bundle will load bytecode compiled by the old engine. I did not reproduce a failure, but QuickJS bytecode is not stable across versions, so this should be fixed independently of everything else here.
9. **The dev host is compile-time.** `FUSE_HOST` and `FUSE_PORT` are `--dart-define`s (`dart/lib/src/runtime.dart:18-22`), passed by `fuse dev` (`cli/dev.ts:93-98`). A prebuilt dev client needs these at runtime.
10. **No built-in reads `BuildContext`.** None of the nine builders uses `Theme.of`, `MediaQuery` or any inherited widget. `host.brightness` is pushed from a binding observer instead (`dart/lib/src/engine.dart:172-180`, `src/host.ts:35-38`).

## 1. Source of truth and what gets generated

### Measurements

**Binary size** (android-arm64 release `app.so`, Flutter 3.50.1; tear-off tables are a lower bound because real adapters also pin parameter types):

| What is pinned | Widgets | app.so | gzip -9 |
|---|---:|---:|---:|
| Minimal MaterialApp + Text | 0 | 4.07 MB | 1.52 MB |
| What today's nine built-ins pin | 24 | 6.38 MB | 2.33 MB |
| 60 everyday material widgets | 60 | 8.16 MB | 2.96 MB |
| All of the widgets layer | 293 | 8.22 MB | 2.96 MB |
| widgets + material | 481 | 12.63 MB | 4.46 MB |
| widgets + material + cupertino | 538 | 13.77 MB | 4.84 MB |

- Material is where the weight is: 60 common material widgets cost as much as all 293 widgets-layer classes.
- Average marginal cost per widget is about 14 KB (widgets layer), 23 KB (material), 20 KB (cupertino), uncompressed.
- Adapter code costs about 245 bytes per decoded prop (2.9 KB for a 12-prop adapter). The 538 widgets average about 14.5 named parameters, so adapters for all of them add an estimated 1.9 MB uncompressed. This estimate is from a synthetic adapter repeated 200 times; real adapters with nested value types will be larger.
- Total for a kitchen-sink host: roughly 16 MB against 6.4 MB today, about +10 MB uncompressed and about +3 MB compressed per ABI. For scale, `libflutter.so` itself is on the order of 10 MB per ABI.

**Decode cost** (x64 Linux AOT, one 14-prop view-like node):

| Variant | ns per decode |
|---|---:|
| A: current `FuseMap` accessors + lenient parsers | 960 |
| B: generated decoder, string keys, canonical values | 266 |
| C: generated decoder, positional slots | 139 |
| D: decoded once at `setProp`, build reads typed fields | 10 |
| E: B plus dev-mode validation of every prop | 642 |

- All of these are small against a frame: 1,000 nodes rebuilding in one frame cost about 1 ms today and 0.27 ms with B.
- Most of the saving (A to B, 694 ns) comes from canonical wire values, not from generated code as such. Slots add 127 ns on top.
- Not measured: the bridge itself (`JsValue` conversion, the `Map.from` copy per op at `dart/lib/src/runtime.dart:174-176`), and the cost of doing the same coercion in QuickJS, which has no JIT. Decode cost should not drive the architecture either way.

### The five options

| | A: Dart-first analyzer | B: TS-first spec | C: shared IDL | D: annotate hand-written builders | E: constructor interpreter |
|---|---|---|---|---|---|
| Authoring cost per widget | None for 1:1 cases; an override entry for the rest | A TS spec per widget, forever | An IDL entry per widget, plus both sides | Dart builder plus annotations | None for 1:1 cases |
| Type safety | Dart compiler checks adapters against the real constructor; TS generated | TS is exact; generated Dart can drift from the real Flutter API until it fails to compile | Neither side is checked against Flutter until compile | Good if props are declared, weak if scraped | None in Dart: errors surface as runtime `TypeError` |
| Binary size | Per registered widget (table above) plus 245 B per prop | Same as A | Same as A | Same as today | Same tear-off cost; less adapter code, more schema data |
| Tree shaking | Works per allow-listed widget | Same | Same | Same as today | Defeated unless the table is also allow-listed |
| Decode per rebuild | B or D in the table | Same | Same | A today | Slower than A: generic dispatch plus runtime type switches |
| Debuggability | Readable generated Dart, breakpoints work | Same | Same | Best: it is your code | Worst: one generic call site for every widget |
| Fits pub packages | Yes, nobody has to write anything | No: someone must write a spec for fl_chart | No | No | Yes |

Detail on the two that need it:

- **B (TS-first)** is right for React Native because the native component is written to the spec. Here the Dart API already exists and is not ours. A TS spec for `SliverAppBar` would be a second copy of Flutter's API that goes stale on every Flutter release. TS-first is a reasonable fit only for contracts the app itself owns (channels), covered in section 5.
- **E (interpreter)** needs `Function.apply` with named-argument `Symbol`s. That works in AOT, but symbols built from runtime strings do not survive `--obfuscate`, every argument still needs a type-directed conversion (so the schema ships as runtime data and is interpreted), and tree shaking is defeated exactly as in a kitchen-sink A. Its only real advantage is less adapter code. Generated adapters are the same idea resolved at build time, with compiler checking.
- **C (IDL)** is wrong as an authoring surface and right as an intermediate format. This is the recommendation: A produces it, D-style declarations can produce it, everything else consumes it.
- **D by scraping** is already measured in `/home/claude/wt/experiments-env/experiments/dart-to-ts/README.md`: 131 props matched, 55 TS-only, 52 type mismatches. Syntax scraping cannot see props read through non-literal keys or shared helpers. D by declaration collapses into A: see the next section.

### Recommended shape: one generator, three inputs

The generator has one capability: resolve a Dart constructor signature into a manifest entry. It is applied to three kinds of input.

1. **Flutter and pub widgets.** The adapter constructs the widget directly.
2. **Plain Flutter widgets in the app or a Fuse library.** The escape hatch is an ordinary widget with typed parameters:
   ```dart
   // dart/lib/fuse/badge.dart: no FuseNode, no registration call
   class Badge extends StatelessWidget {
     const Badge({super.key, required this.label, this.color, this.onTap, this.child});
     final String label; final Color? color; final VoidCallback? onTap; final Widget? child;
     ...
   }
   ```
   The generator emits the adapter, the registration and the TS component. This replaces the two-file pattern in `packages/docs/content/docs/extending/creating-widgets.mdx` for most cases, and it is something any agent that knows Flutter can write without learning Fuse's Dart API.
3. **Low-level `FuseNode` builders.** They stay for widgets that need the node (`flexChildren`, handle lookup, child delegates). Their props are declared in a small manifest fragment next to the builder, since their signature carries no information.

Tooling: a standalone `dart run solid_fuse:gen` using `package:analyzer` against the app's `package_config.json`, so it resolves exactly the versions the app compiles. Not `build_runner` (slow, and it adds a dev dependency and a build step to every app) and not macros (Dart macros were cancelled).

### The four kinds, plus widgets

The owner's UniFFI-style taxonomy should be the organising structure of the manifest. Each parameter type resolves to exactly one kind; an unclassifiable parameter is omitted with a recorded reason, never guessed.

| Kind | Crosses the bridge as | Today | Generated |
|---|---|---|---|
| Record | A copied value | Ad hoc maps and `parse*` functions | A codec per value class (`EdgeInsets`, `TextStyle`, `BoxDecoration`), chosen from its constructors or an override |
| Enum | A string | Hand-written `switch` per widget (`dart/lib/src/widgets/scroll_view.dart:20-51`) | `Enum.values.byName`, TS string union |
| Object | A reference with identity | Handles (`{_node: id}`) | Handle class with typed methods, direction "JS calls Dart" |
| Callback interface | A reference to something JS implements | `true` marker plus `_functionCall` | Typed payload record, direction "Dart calls JS" |
| Widget | A tree node | `registerWidget` | Adapter plus TS component; child slots are `Widget` and `List<Widget>` params |

Pigeon's direction marking maps directly: handles are the `@HostApi` case, callback interfaces the `@FlutterApi` case, and the manifest should state the direction on each. It also lets the wire replace the ambiguous `true` marker (fact 3) with knowledge from the schema.

**What "JS implements a Dart interface" can mean here.** Because of fact 1, each method is classified by its return type:

| Dart signature | Generated? | Mechanism |
|---|---|---|
| `void Function(args)` | Yes | Fire-and-forget `_functionCall`, payload encoded as a record |
| `Future<T> Function(args)` | Yes | `_functionCallAsync` (already on `slivers`), e.g. `onRefresh`, `confirmDismiss` |
| `T Function(args)`, synchronous | No | One of the patterns below, chosen by hand |
| `Widget Function(BuildContext, ...)` | No | Same |
| Abstract class to subclass (`CustomPainter`, `SliverPersistentHeaderDelegate`) | No | Hand-written Dart |

Patterns for the synchronous cases, all of which already exist in the repo or on `slivers`:

- **Evaluate ahead in JS and send data.** A `validator` becomes a reactive `errorText`; a `MaterialStateProperty.resolveWith` becomes a map of states to values.
- **Eager children, lazy inflation.** JS renders all items; Dart builds only the visible ones (`fuseSliverChildDelegate` in `/home/claude/wt/slivers/packages/solid-fuse/dart/lib/src/widgets/slivers/sliver_support.dart`). Good to a few thousand items, since every item is still a JS node.
- **Builder/signal with one frame of lag.** Dart pushes the builder arguments, JS re-renders into the node (`sliver_layout_builder.dart` and `sliver-layout-builder.tsx` on `slivers`).
- **Hand-written Dart** for the rest.

The generator should emit the first two rows and report the others as "needs a pattern", with the parameter name and type, so an agent knows exactly what is missing. It should not apply the lag pattern silently: a one-frame-late layout is a behaviour the author must choose.

A blocking synchronous call from the UI thread into the JS thread, or a second QuickJS context on the UI thread for small pure functions (the Reanimated worklet model), would lift this limit. I did not check whether fjs can support either, and both carry jank and deadlock risk. Treat as a separate investigation.

### Hard cases

| Case | Handling |
|---|---|
| Callbacks with payloads | Generated: payload class fields become a record. Non-serialisable fields are dropped and listed. `gesture_detector.dart` (239 lines of hand serialisation) is the model output. |
| Synchronous return values, builders | Not generated; table above. |
| Controllers and Listenables | Object kind. Constructor params become create props, public methods become RPC. A `Listenable` gets a generated listener that pushes named getters to JS signals, which is what `scroll_controller.dart:12-14` does by hand. Which getters to push is an override, since pushing all of them on every notification is wasteful. |
| Generics | `T` becomes `unknown` in TS and passes through as a JSON-like value. `DropdownButton<T>` works for strings and numbers, not for objects with identity. `MaterialPage<void>` style instantiation is fixed in the adapter. |
| `BuildContext`-dependent values | The adapter runs inside `build`, so it has a context. A record codec can accept a context reference such as `{$theme: "colorScheme.primary"}` and resolve it in Dart. This needs a small fixed vocabulary (theme colours, text styles, media query padding) and is new design, not something the generator derives. JS-side reads of the same values stay on the `host` pattern. |
| InheritedWidgets | Providing one (`Theme`, `DefaultTextStyle`, `MediaQuery`) is an ordinary generated widget. Consuming one from JS is the previous row. |
| Keys | Node identity already supplies `ValueKey(node.id)` (`dart/lib/src/node_widget.dart:8`). `key` params are omitted from generated props. `GlobalKey` use cases map to handles. |
| Animations | Implicit ones (`AnimatedContainer`, `AnimatedOpacity`) are plain widgets and generate fine. Explicit ones need `AnimationController` with a `TickerProvider`, which is a hand-written handle. Driving per-frame values from JS across the async bridge should not be the supported path. |

## 2. Layering

The three-layer shape is right, with one correction to how thick the JS layer should be.

1. **Raw generated bindings.** 1:1 with Dart constructors, TS types plus Dart adapters, never edited.
2. **JS ergonomic layer.** Hand-written, pure JS, so it is OTA-updatable once OTA exists.
3. **Dart escape hatch.** Plain Flutter widgets (generated adapters) or `FuseNode` builders (existing API).

**Keep the JS layer thin for hot primitives.** `FuseViewWidget` composes up to 13 Flutter widgets from one node (`dart/lib/src/widgets/view.dart:49-177`). Rebuilding `View` in JS from raw `Padding`, `Align`, `DecoratedBox` and so on would turn one node into up to 13, each with its own `ChangeNotifier`, `ListenableBuilder` and bridge ops. JS wrappers should reshape props and supply defaults; composition belongs in JS only where it is real application structure. `View`, `Text`, `TextField` and `GestureDetector` should stay as deliberately fat Dart primitives.

This is where I differ slightly from `03-prior-art.md` lesson 5 ("mirror Flutter 1:1, do not invent a friendlier API"). That is right for the raw layer and for pub packages. The existing `View` with `flex` is an invented API that is already shipped, documented and used; it should stay as the curated layer over the raw one, not be retired.

**Where coercion lives.** Split by layer:

- **Raw layer: canonical wire values, coercion in JS.** Colour as an ARGB int, `EdgeInsets` as `[l, t, r, b]`, enums as exact names. Friendly inputs (`"blue"`, `16`, `{horizontal: 8}`) are normalised by small JS helpers before the wire. The reasons are stability and OTA, not speed: adding a colour name or a new shorthand becomes a JS-only change, and the Dart decoder for a type has one shape that only changes when Flutter does. The measured Dart saving (694 ns per node) is a side effect.
- **Existing built-ins: unchanged.** `parseColor` and friends stay for the nine hand-written builders. Moving them would change behaviour for existing apps for no user-visible gain.
- Cost to state plainly: two conventions exist until the built-ins are regenerated, and JS-side coercion runs in an interpreter. It runs once per prop change, off the UI thread, where today's Dart coercion re-runs for every prop on every rebuild of the node.

**Existing built-ins and consumer apps.**

| | Built-ins | Consumer apps |
|---|---|---|
| A + manifest (recommended) | Unchanged Dart. Their props get a hand-declared manifest fragment so validation and docs cover them. TS interfaces can later be generated from it. | No change required. New generated widgets appear next to existing ones. |
| Rewrite built-ins as JS over raw bindings | `view.dart` deleted, replaced by JS composition | Same JSX, but more nodes per view and different layout edge cases. High risk, no benefit. |
| TS-first or IDL | Every built-in rewritten against the spec | Apps with their own `registerWidget` builders must write specs to keep type safety |
| Interpreter | Built-ins become table entries | Apps lose Dart-side breakpoints in their own widgets |

`registerWidget(String, Widget Function(FuseNode))` must remain supported indefinitely. Generated adapters are just callers of it.

## 3. `fuse add <pub_package>`

### Layout

```
my-app/
  fuse.config.ts                 # declares the native surface (below)
  fuse.lock                      # resolved versions + manifest hashes + native fingerprint (committed)
  src/_generated/
    fl_chart.ts                  # raw TS: props interfaces, components, records, enums
    app.ts                       # same, for plain widgets found in dart/lib/fuse/
    manifest.json                # merged manifest, imported only in dev builds
  src/fl-chart.overrides.ts      # optional hand-written ergonomic wrappers (not generated)
  dart/lib/_generated/
    fuse_packages.dart           # exists today; now also calls the generated registrars
    fl_chart.fuse.g.dart         # adapters + registerFlChart(runtime)
    app.fuse.g.dart
  dart/lib/fuse/                 # plain Flutter widgets the generator picks up
```

- **In the app, not in `node_modules` and not a generated local package.** `node_modules` is not committed and is rewritten by yalc pushes. A separate local Dart package adds a `pubspec_overrides` entry and a pub resolution step for no gain, since `dart/lib/_generated/` already exists and is already imported by `main.dart`.
- **Committed.** An agent without a Flutter toolchain can then type-check and read the API; API changes show up in review; CI runs `fuse gen --check` to fail on stale output. This is the Convex choice, and the demo already commits `fuse_packages.dart`.
- **Real files, not virtual modules.** Import as `~/_generated/fl_chart` or by relative path. A `fuse:fl_chart` scheme would need a Vite resolver, a `declare module` shim and tsconfig paths, and it breaks grep and go-to-definition, which is how agents explore.

### Config

```ts
export default defineConfig({
  native: {
    flutter: { include: ["SliverAppBar", "Card", "ListTile", "Switch"] },
    packages: {
      fl_chart: {
        version: "^1.0.0",
        include: ["LineChart", "BarChart"],        // widgets; records and enums follow by closure
        overrides: {
          "LineChartData.lineTouchData": { omit: true, reason: "sync callbacks" },
          "FlSpot": { record: "tuple" },
        },
      },
    },
  },
});
```

This extends `FuseConfig` (`src/config.ts:4-15`). Overrides are data in the config, not edits to generated files: omit a parameter, rename a tag, pick the codec constructor for a record, name which getters a Listenable pushes.

### Flow

1. `fuse add fl_chart` adds the dependency under `dependencies:` in `dart/pubspec.yaml` with the existing `# fuse-managed` marker (`cli/utils.ts:150-165`), then runs `flutter pub get`.
2. It runs the generator in "survey" mode and prints what the package exports: widgets, how many parameters each has, and which parameters cannot be generated and why.
3. The user or agent picks widgets; they are written to `include`. With `--all` everything exported is included.
4. `fuse gen` writes `src/_generated/fl_chart.ts`, `dart/lib/_generated/fl_chart.fuse.g.dart` and updates `manifest.json` and `fuse.lock`.
5. `fuse link` (already run by `fuse dev` and `fuse build`, `cli/dev.ts:20`, `cli/build/app.ts:13`) adds the generated registrars to `fuse_packages.dart`.

### Selection: types for everything, adapters by allow-list

- **TS types** can cover the whole package cheaply, since they erase.
- **Dart adapters** are generated only for the allow-list, because each costs binary size.
- **Not derived from JS imports for release builds.** Tree shaking Dart from the JS import graph gives the smallest binary, but it makes the native surface a function of JS code: importing one new widget silently requires a native rebuild, which is the opposite of the OTA goal. The import graph is still useful in two places: in `fuse dev`, importing a known-but-unlisted widget can add it to `include` and tell you a native rebuild is needed; in `fuse build`, it gives the bundle's `requires` set (section 4) and can report allow-listed widgets nothing uses.

### Version bumps

`fuse.lock` records, per package, the resolved version and the manifest hash. `fuse link` compares it against the resolved `package_config.json`; on a difference it regenerates and prints an API diff (removed parameters, changed types, newly ungeneratable parameters). A removed parameter then fails `tsc` at the JSX call site, and an override that names a parameter that no longer exists fails generation with the override's location. The same mechanism covers a Flutter SDK upgrade. This is the Prisma-style guarantee.

### Fuse library packages on npm

A library that wraps a pub package runs the same generator at its own build time and ships the output: its `dart/` contains the adapters, and it publishes a `fuse.manifest.json` beside `fuse.config.ts`. `fuse link` already discovers the package (`cli/utils.ts:53-121`); it additionally merges the manifest into the app's. Consumers do not need the analyzer for libraries.

Two problems to solve first:

- **Collisions.** If an app and a library both generate `LineChart`, the second `registerWidget` silently wins (fact 6). Generated tags should be namespaced by Dart package (`fl_chart.LineChart`), and `registerWidget` should report a duplicate with different manifest hashes.
- **Version skew between a library's generated adapters and the app's resolved pub version.** The adapters are Dart source compiled in the app, so an incompatible version fails to compile, which is the right failure. The library should declare the pub version range it generated against.

## 4. OTA and caching

### What needs a native rebuild today

| Change | Dev | Release |
|---|---|---|
| App JS composed of existing widgets | HMR, no rebuild | Native rebuild: the bundle is a Flutter asset (`dart/lib/src/quickjs_connection.dart:41`, `cli/config.ts:63`) |
| New prop on an existing widget | Hot reload of the Dart builder plus a TS edit | Native rebuild |
| New widget, handle or handle method | Hot restart (registration runs in `main` before `start`) | Native rebuild |
| New pub package | Full `flutter run` | Native rebuild |
| solid-fuse or fjs upgrade | Full rebuild | Native rebuild |

`architecture.mdx` says the bundle "can ship continuously, including over-the-air". No code does that yet: there is no loader for a bundle outside assets, no version check, and the bytecode cache has one slot.

### What moves to JS-only with a broad generated host

- On the `slivers` branch, 23 of the 39 new Dart files under `widgets/` are at most 45 lines with no callbacks, state, handles or builders. Those are the files a generator replaces, and against a host that already registers the underlying widgets they need no native change at all. The other 16 (app bar, nested scroll view, reorderable list, persistent header, layout builder) contain real logic and would still be hand-written Dart.
- New ergonomic wrappers, new coercions and shorthands, composition and theming all become JS-only.
- Still native: any widget outside the host's allow-list, any new pub package (especially one with platform code), anything in the "needs a pattern" list, and engine upgrades.

So the claim "more freedom with OTA" is true for the prop-forwarding majority and false for the cases that are hard today. The honest framing is that codegen plus an allow-list turns "is this change OTA-safe?" from a judgement into a computed answer.

### Compatibility contract

Three artefacts:

- **Host manifest**, compiled into the binary: protocol version, QuickJS bytecode version, and for every registered type its kind, props (name, wire type), methods and callback payloads.
- **Native fingerprint**: a hash of the canonical manifest. Stored in `fuse.lock`.
- **Bundle requirements**, emitted by `fuse build` beside the bundle (`bundle.meta.json`): the fingerprint it was built against, and the subset actually used (types, props, handle methods), taken from the import graph and the generated components.

Rules:

1. Fingerprints equal: compatible. This is the fast path and the only check Expo's fingerprint policy has.
2. Otherwise, structural subset check: every required type exists, every required prop and method exists with the same wire type. Additive host changes stay compatible, so a newer binary accepts older bundles, and an older binary accepts a newer bundle that does not use anything new.
3. The check runs before evaluation, on the sidecar file. An incompatible downloaded bundle is not run; the host falls back to the embedded bundle, which is compatible by construction because it was built with the binary.
4. Hand-written `FuseNode` builders participate only as far as their declared manifest fragment is accurate. An undeclared builder is opaque: its tag is in the manifest, its props are not checked.

**Bytecode cache.** Key on `(bundle hash, QuickJS bytecode version)` instead of the bundle hash alone, and store entries per bundle hash so the embedded and downloaded bundles do not evict each other (`dart/lib/src/bytecode_cache.dart:21-32, 54-55`). Keep compiling on device: precompiling in `fuse build` would tie the output to the exact QuickJS build and endianness of the build machine.

**`fuse build`.** Compute the fingerprint first. If it matches the fingerprint of the last native build recorded in `fuse.lock`, the native step can be skipped and only the bundle and its sidecar rebuilt. Shipping that bundle is then either an OTA publish or a repack of the existing artefact (re-signing required; feasible on Android, more constrained on iOS). I have not tested repacking.

### Build caching and a generic dev client

- **Prebuilt host shells keyed by fingerprint.** `fuse dev` can skip `flutter run` when an installed dev build has the current fingerprint and just start Vite. This needs the dev host and port to be runtime inputs (launch argument or a small connect screen) instead of `--dart-define`s (fact 9).
- **"Fuse Go".** A dev client with widgets + material + cupertino and a curated set of pub packages registered. From the measurements it is about 16 MB of `app.so` per ABI, which is fine for a dev tool. With a prebuilt linux-x64 build run under a virtual display, an agent in a sandbox can iterate on pure JS and take screenshots with no Flutter toolchain. That is the largest single agent-DX gain available, and it depends only on the generator and the runtime dev-host change.
- A generic client cannot contain app-specific Dart or arbitrary pub packages. Apps that have any fall back to a custom dev client, as in Expo.

### Risks

- **Store policy.** Downloading interpreted JS that runs in an embedded interpreter is the same position as React Native OTA: tolerated while updates do not change the app's primary purpose (details in `03-prior-art.md` 5.1). A broad host makes larger behaviour changes possible over the air, which increases exposure. QuickJS has no JIT, which helps on iOS.
- **Binary size.** About +3 MB compressed per ABI for a kitchen-sink host. Do not make it the default for shipped apps; the allow-list is the control.
- **Version skew.** The subset rule is only as good as the manifest. Behavioural changes inside Flutter widgets between SDK versions are invisible to it: the same props can lay out differently. The fingerprint should therefore include the Flutter and package versions even though the subset check ignores them, so skew is at least logged.
- **Broken bundle in the field.** A bundle that passes the check can still throw at startup. OTA needs a "last known good" rollback independent of this contract.

## 5. Runtime validation and agent DX

### What a manifest available in dev enables

- **Validation where the stack is.** Check props in JS at `setProperty` and `createElement` (`src/renderer.ts:85-90, 114-137`) in dev builds. The JS stack is available there and is already source-mapped by the dev error plugin (`cli/dev-error-plugin.ts`), so the error can name the file and line of the JSX, not just the component name that `_component` carries today (`src/renderer.ts:88`, `dart/lib/src/node.dart:73`). The manifest import is dev-only and drops out of release bundles.
- **Unknown props and tags.** Warn with a nearest-name suggestion. Today an unknown prop is silently ignored and an unknown tag renders a red box from Dart with no source location (`dart/lib/src/runtime.dart:252-262`).
- **Dart-side check at registration and at `applyOps`** for the things JS cannot know: the type is registered in this binary, and the manifest the JS was built against matches the host's.
- **Cost.** Validation added 376 ns per 14-prop node in the Dart benchmark. Irrelevant in dev.
- **Docs and catalogue.** `fuse catalog --json` prints every available tag with props, types, defaults, doc comments from the Dart source and the list of omitted parameters with reasons. The same data generates `llms.txt` and the reference pages under `packages/docs/content/docs/`.
- **Typed handle RPC.** A generated handle class replaces the `switch` on method strings (`dart/lib/src/handles/scroll_controller.dart:22-36`) and the hand-typed TS wrapper; return types flow back through the existing `_handleCall` promise.
- **Typed channels.** Channels are app-owned contracts with no pre-existing Dart signature, so here a single TS definition is the better source: `defineChannel("auth.signIn", { args: v.object({...}), returns: v.string() })` gives the TS type, the dev-mode check, and a generated Dart stub for `channels.on` (`dart/lib/src/channels.dart:21-26`).

### One definition, types and validators

For generated widgets the single definition is the manifest. Emit an explicit TS interface with doc comments, plus the validator table, from the same entry. Do not derive the TS type by inference from a Zod-style schema object: inferred types read badly in hovers and error messages, and there is nothing to keep in sync because both are generated. Inference from one hand-written definition is the right tool only where a human writes the contract, which is channels and app-defined records.

### Convex-style loop inside `fuse dev`

`fuse dev` already owns Vite and the `flutter run` process and writes to Flutter's stdin (`cli/dev.ts:101-104, 134`). Add a watcher and a long-lived generator process (resolved analysis is too slow to start per save):

| Watched | On change | Then |
|---|---|---|
| `dart/lib/fuse/**/*.dart` (plain widgets) | Regenerate that file's adapters and TS | TS change is picked up by Vite HMR. Send `r` to Flutter if only adapter bodies changed, `R` if a registration was added or removed. |
| `fuse.config.ts` `native` section | Regenerate affected packages | `R`, or a message that a full rebuild is needed if a pub dependency was added |
| `pubspec.lock` / `package_config.json` | Regenerate everything, print the API diff | Full rebuild message |

The watcher must say which of the three outcomes applies. A new registration does not take effect on hot reload because registration runs before `runtime.start()`.

### Agent workflows

**(i) Use a Flutter widget that is not wrapped yet**

- Before: read `creating-widgets.mdx`; write a Dart builder reading props by string; register it; write a TS interface by hand; keep both in sync; hot restart; find out about a misspelt prop by seeing nothing happen.
- After: `fuse catalog Card` shows whether it is available. If not, add `"Card"` to `native.flutter.include`, run `fuse gen`, import `Card` from `~/_generated/flutter`. Props are type-checked, and the output lists anything omitted. No Dart written. Against a Fuse Go client, no native step either.

**(ii) Add a pub package**

- Before: `flutter pub add`, then workflow (i) for each widget, plus hand-serialising every callback payload.
- After: `fuse add fl_chart`, read the survey, choose widgets, write an optional thin JS wrapper for ergonomics. The agent writes Dart only for parameters reported as "needs a pattern".

**(iii) Debug a wrong prop**

- Before: nothing in TS if the tag is used directly; at runtime the value is silently ignored or mis-parsed (`parseColor` returns null for an unknown name, `dart/lib/src/utils.dart:34-85`); the agent reads Dart source to find the accepted keys.
- After: a TS error at authoring time; in dev, a runtime error such as `<Card> in ProfileScreen (src/screens/profile.tsx:41): prop "elevation" expects number, got "4"` in the `fuse dev` terminal.

## 6. Slot-indexed wire format (Nitro's lesson)

Assessment: not worth it on the wire.

- **Gain.** 127 ns per 14-prop node in Dart (B to C). The current op already carries the prop name once per change (`src/renderer.ts:118, 129`), so the saving on the bridge is one short string per `setProp`. I did not measure the bridge.
- **Debuggability cost.** Ops, the dev error box's props dump (`dart/lib/src/runtime.dart:272-275`) and any wire log become unreadable without the manifest.
- **OTA cost, which decides it.** Positional indexes are baked into the bundle. Any host update that inserts or reorders a parameter silently assigns values to the wrong props unless fingerprints are required to be equal, which removes the additive-compatibility rule in section 4. Names are self-describing: an unknown name can be ignored and a missing one defaulted.
- **How to get the benefit anyway.** Generated adapters decode once at `setProp` time into a typed props object and `build` reads fields (variant D: 10 ns). The slots then exist in Dart memory, not on the wire. If bridge cost is later shown to matter, intern prop names per session (JS sends a name table at startup); session-local ids cannot skew.

## 7. Structural changes, in order

Each step is useful alone and none breaks existing apps.

1. **Independent fixes.** Key the bytecode cache on bundle hash plus QuickJS bytecode version (`dart/lib/src/bytecode_cache.dart`). Report duplicate `registerWidget` / `registerHandle` tags in debug (`dart/lib/src/runtime.dart:51-60`).
2. **`fuse gen` for plain widgets and one pub package (smallest valuable step).**
   - New: `cli/gen.ts`, `cli/add.ts`, a Dart generator entry point under `dart/bin/` or `dart/tool/`.
   - `FuseConfig.native` in `src/config.ts`; `fuse.lock`.
   - `cli/link.ts` adds generated registrars to `fuse_packages.dart`.
   - Runtime unchanged: adapters call `registerWidget` and read `FuseNode`.
   - Docs: rewrite `extending/using-packages.mdx` and `extending/creating-widgets.mdx` around it; keep the `FuseNode` builder path as the advanced section.
3. **Manifest and dev validation.**
   - Manifest fragments for the nine built-ins and three handles (`dart/lib/src/solid_fuse_package.dart:19-31`).
   - Dev-only validation in `src/renderer.ts`; `fuse catalog`; generated `llms.txt`.
   - `fuse link` merges `fuse.manifest.json` from npm Fuse packages (`cli/utils.ts:53-121`).
4. **Explicit prop kinds on the wire.**
   - Replace the `true` callback marker with a tagged value or schema knowledge (`src/renderer.ts:115-118`, `dart/lib/src/node.dart:154-157`), keeping the old form readable for one release.
   - Merge `asyncCallback` and node-list props from `slivers` as manifest kinds instead of renderer special cases.
   - `FuseNode` gains a decoded-props cache invalidated in `setPropSilent` (`dart/lib/src/node.dart:203-205`), so generated adapters decode once.
5. **Canonical records and JS coercion helpers** for the raw layer; built-ins keep their Dart parsers.
6. **Typed handles and callback interfaces** generated from controller classes; typed channels from TS definitions.
7. **Watcher in `fuse dev`** with the long-lived generator.
8. **OTA.** Host manifest and fingerprint compiled in; `bundle.meta.json` from `fuse build`; a loader for bundles outside assets with the subset check and fallback; multi-entry bytecode cache.
9. **Runtime dev host, prebuilt dev clients, Fuse Go; fingerprint-keyed native build skipping.**
10. **Optional:** generate the built-ins' TS interfaces from their manifest fragments and delete the hand-written ones under `src/widgets/`.

### What should not be done

- Do not register all of Flutter in shipped apps by default. Allow-list.
- Do not derive the release native surface from JS imports.
- Do not rebuild `View`, `Text` or `TextField` as JS compositions of raw widgets.
- Do not adopt a positional wire format.
- Do not build a `Function.apply` constructor interpreter.
- Do not author Flutter widget specs in TS or an IDL.
- Do not use `build_runner` or wait for macros.
- Do not apply the one-frame-lag builder pattern automatically, and do not guess at unclassifiable parameters. Omit and report.
- Do not expose generated code through virtual modules, and do not put it in `node_modules`.
- Do not remove or change `registerWidget(type, FuseNode -> Widget)`.
- Do not present OTA as available before step 8.

## Strongest counter-arguments

1. **The generated surface may be the easy 60% and the product value may be in the other 40%.** Lists, navigation, text input, animation and anything with a builder are where apps spend their effort, and all of them stay hand-written. If the curated layer for those is what makes Fuse usable, a generator is a large investment in the part that was already cheap. The slivers count supports this reading as much as mine: the 23 thin files total 518 lines, the other 16 total 1,026.
2. **1:1 Flutter bindings expose Flutter's API to people and agents who came for JSX.** Flutter's API is wide, positional in places, and context-dependent. A raw layer that is technically complete but awkward (`MaterialStateProperty`, `TextStyle` inheritance, `Expanded` only valid under `Flex`) may produce worse agent output than a small curated set with good docs. Runtime validation catches type errors, not misuse.
3. **Analyzer coupling is a maintenance cost.** `package:analyzer` has breaking releases, resolved analysis is slow on cold start, and the generator must track every Flutter release. Today's framework has no such dependency. Committing output and shipping pre-generated library manifests limit who pays this, but someone does.
4. **The manifest gives a false sense of OTA safety.** It proves the bundle's props exist. It does not prove the app works against a different Flutter version, and it knows nothing about hand-written builders that did not declare their props. A plain "runtime version" string that the developer bumps by hand is cruder but does not claim more than it knows.
5. **Two conventions for a long time.** Built-ins with lenient Dart parsing next to generated widgets with canonical values and JS coercion means `color="blue"` works through different code depending on the widget. Unifying them means either changing the built-ins (compatibility risk) or giving up the stable-Dart argument.
6. **A narrower alternative reaches most of the DX benefit.** Declaring props for hand-written builders (option D by declaration) plus the manifest, validation and catalogue gives typed props, precise errors and agent-readable docs without any Flutter-wide generation, analyzer daemon or allow-list design. If OTA and a generic dev client are not near-term goals, that is the cheaper path, and step 3 of the migration can be done before step 2.

My judgement is that the generator is still worth building because the escape hatch as a plain Flutter widget, pub packages without hand-written glue, and the Fuse Go loop for agents all depend on it. Counter-arguments 1 and 6 are the ones I would test first, by running the generator spike over a real consumer app's widgets and counting how many of its hand-written builders it actually replaces.

## Not verified

- No run of the framework itself: nothing here was tested on a device or simulator.
- Bridge cost (`JsValue` conversion, per-op map copies) and QuickJS-side coercion cost were not measured.
- Size figures are for android-arm64 only, from tear-off tables plus a synthetic adapter estimate, not from real generated adapters.
- The bytecode-version skew in fact 8 is from reading the code, not from a reproduced crash.
- Whether fjs can support a synchronous or UI-thread JS call was not checked.
- Repacking a built artefact with a new bundle was not tested.
