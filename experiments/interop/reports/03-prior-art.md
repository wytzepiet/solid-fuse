# 03 — Prior art for generated Dart-to-JS interop

Scope: what existing systems teach us about generating TS types and Dart adapters from Dart APIs (Flutter SDK and pub.dev packages), the JS-facing API shape, OTA compatibility, build caching, and DX for coding agents.

Research date: 2026-11-20.

## How to read this

Each claim is marked with how it was established:

- **[V]** read from the cited page during this research session.
- **[K]** from background knowledge, not re-verified this session (the page was unreachable, rate-limited, or did not contain the detail). Treat as a lead to confirm before relying on it.

What could not be verified is collected in [Verification gaps](#verification-gaps) at the end.

---

## Part 1 — Per-system notes

### 1. React Native family

#### 1.1 React Native Codegen (Fabric components, TurboModules)

- **Direction: JS spec to native.** Codegen "crawls the folders in your project... looking for some specific JS files that contain the specification (or specs) for your custom modules and components." Specs are "JS files written in a typed dialect: React Native currently supports Flow and TypeScript." It emits C++ glue plus Java and Objective-C++. [V] https://reactnative.dev/docs/next/the-new-architecture/what-is-codegen
- **When it runs:** "React Native invokes Codegen automatically every time an iOS or Android app is built." Generated code is build output, not something the library ships. [V] same page
- **Why JS is the source of truth [K]:** RN has two or more native implementations per module (iOS, Android, sometimes C++). The JS spec is the only artefact common to all of them, so it is the natural single definition. That argument does not transfer to solid-fuse, which has exactly one native implementation language (Dart) and whose native APIs already exist before any spec is written.
- **Complaints** (as listed by Nitro's author, so partisan, but they match common community complaints) [V] https://nitro.margelo.com/docs/comparison:
  - Codegen runs at app build, so every app regenerates every library's specs.
  - The spec parser cannot resolve imports from other files.
  - Events are untyped and declared natively.
  - Native objects cannot be represented; every module is a singleton with static-like methods. People work around this with files, base64 or blobs.
  - Functions are not first-class: a JS callback cannot be held and called repeatedly.
  - No property syntax, no tuples, no direct Swift.
- **The underlying cause of most complaints [K]:** the spec is parsed by a custom Flow/TS parser that supports a subset of the type language. It is not the TypeScript checker. The subset is discovered by trial and error.

#### 1.2 Expo Modules API (owner-supplied source)

- **What it is:** Swift and Kotlin DSL for modules and views, aiming to "take advantage of modern language features", "be as consistent as possible on both platforms", and "require minimal boilerplate". [V] https://docs.expo.dev/modules/overview/
- **Direction: native is the source of truth, and for years TS types were hand-written.** Nitro's comparison says of Expo: "All native modules are considered untyped", with TS definitions written afterwards, which can drift, "especially around null-safety". [V] https://nitro.margelo.com/docs/comparison
- **Why native-first:** the runtime "has full knowledge of the argument types the native function expects", so it validates and converts arguments at the boundary; dictionaries become typed `Record` structs; `SharedObject` keeps object state native-side. They also avoid C++ because it "has a negative impact on build times, especially on Android". [V] https://docs.expo.dev/modules/design.md
- **They have now added native-to-TS generation.** `expo-type-information` (SDK 56+, macOS only) parses Swift modules with `sourcekitten` into a normalized type layer and emits a TS AST. It handles `Function`, `AsyncFunction`, `Prop`, `View`, `Events`, `Record` with `@Field`, and basic enums. Stated gaps: "Parsing a Swift file is a complex task and not everything is now implemented", nested classes unresolved, enum associated values not parsed, one inference mode "can occasionally fail on some modules". It can also generate mocks. [V] https://docs.expo.dev/modules/type-generation-reference.md
- **Lesson noted by owner:** Expo is the closest precedent for "the implementing language defines the contract, and the runtime validates at the boundary". Two things to take from it: (a) boundary validation driven by the declared types, which makes errors precise; (b) their generator works from a syntax-level parse and is therefore lossy. Dart's `analyzer` package gives fully resolved types, so solid-fuse can do what Expo is struggling to do.

#### 1.3 Nitro Modules (owner-supplied source)

- **Direction: TS spec to C++/Swift/Kotlin** through `nitrogen`. Unlike RN codegen, "Nitrogen is executed explicitly by the library developer and all generated interfaces are part of the npm package to always ship a working solution." Specs can drift "if you forget to run Nitrogen". [V] https://nitro.margelo.com/docs/comparison
- **Hybrid Objects:** native objects with identity that are "created, passed around, and destroyed like any other object"; callbacks are first-class and can be stored and called repeatedly. Backed by `jsi::NativeState` with known memory size for GC pressure. [V] https://nitro.margelo.com/docs/what-is-nitro
- **Performance:** 100,000 `addNumbers` calls: Nitro 7.27 ms, Turbo 115.86 ms, Expo 434.85 ms. The page attributes this to type checking at compile time, which "introduces zero runtime overhead". The author cautions these are extreme-case microbenchmarks. [V] same pages
- **Lesson noted by owner:** when the contract is known at build time, generated code does not need to look anything up by name at runtime. For solid-fuse the analogue is a generated prop reader with fixed slots (a `switch` on a small integer or a positional array) instead of `node.double('strokeWidth')` hash lookups, and a generated setter per prop instead of a generic rebuild.

### 2. NativeScript — "the whole native API from JS"

- **How it works:** the build generates metadata from the platform SDKs and any third-party libraries. "You cannot use APIs that are not present in the metadata." Android: a generator reads bytecode of public types and writes a binary format with JNI signatures, embedded in the APK. iOS: a custom format generated from SDK headers, embedded in the IPA. The runtime resolves JS property access against this metadata and marshals calls. [V] https://docs.nativescript.org/guide/metadata
- **Cost and filtering:** by default everything is included. Filtering exists for three stated reasons: security, runtime performance ("larger metadata to search at startup or on unknown lookups"), and app size. Plugins declare usage in `native-api-usage.json` (`{"uses": ["java.util:List"]}`); the app has the final say with `whitelist`, `blacklist` and `whitelist-plugins-usages`. A filtered-out class is `undefined` at runtime and throws when called; you debug by reading generator logs. The docs give no size or startup numbers. [V] same page
- **Version skew is the user's problem:** metadata is built against `compileSdk`; calling an API newer than the device throws at runtime and you must guard with `SDK_INT` checks. [V] same page
- **Typings:** `ns typings ios` and `ns typings android --jar|--aar|<maven coordinate>` generate `.d.ts` per library, which you reference from `references.d.ts`. [V] https://docs.nativescript.org/guide/native-code/generate-typings
- **Typings volume became a DX problem.** In 8.2 they stopped including all platform declarations by default because the "TypeScript language service in your IDE will index these types as well as load them during compilation". Users who needed a removed type had to find the file in `@nativescript/types-ios` and add a reference by hand. [V] https://blog.nativescript.org/where-did-my-types-go
- **Plugins [K]:** the ecosystem still consists mostly of hand-written plugins that wrap raw native calls in a cross-platform TS API. Raw access did not remove the need for a curated layer; it moved where the curated layer is written (in TS instead of in native code).
- **Transfer to solid-fuse:** NativeScript's model depends on runtime reflection (JNI, ObjC runtime). Flutter AOT has none: `dart:mirrors` is unavailable and tree shaking removes unreferenced code. So "everything is callable" is not available to us for free. Every exposed API must be referenced by generated Dart code, which defeats tree shaking for that API and costs binary size. NativeScript's filter file is optional tuning; for us an allow-list is structurally required.

### 3. Flutter-side dynamic UI systems

#### 3.1 rfw (Remote Flutter Widgets)

- **Bindings: hand-written closures.** A `LocalWidgetLibrary` is a map of names to `LocalWidgetBuilder` closures that read arguments through `DataSource` (`source.v<double>(['size'])`, `source.child`, `source.childList`). Type mismatches return null. `createCoreWidgets` and `createMaterialWidgets` ship in the package. [V] https://pub.dev/packages/rfw
- **Value types:** `ArgumentDecoders` handles "enums, `Color`s, or `Paint`s", curves, durations. Padding is passed as numeric lists (`padding: [8.0]`). [V]
- **Callbacks:** "Since remote widget libraries are declarative and not code, they cannot represent executable closures." They become `event` values routed to `RemoteWidget.onEvent`. [V]
- **Stated limits:** rfw "is best suited for interfaces made out of prebuilt components". It cannot create widgets that need code (page transitions, drag and drop, custom painters). Moving a whole app into it "won't work". [V]
- **Compatibility:** best-effort backwards compatibility, no version negotiation; the package suggests contributing golden tests. [V]
- **Why no generator [K]:** the README and design discussions frame the local library as a deliberately small, curated, stable interface that the app author owns, because the remote file outlives the binary. A generated mirror of the Flutter API would change with every Flutter release and break deployed files.
- **Third-party generator:** `rfw_gen` (pre-1.0, unverified uploader) uses the analyzer to resolve constructors and emits `.rfwtxt`, a `LocalWidgetBuilder` map, and a `.rfw_meta.json` of parameters, child types and handlers. It supports 65 widgets out of the box. Stated limits include `double.infinity` being unrepresentable. [V] https://pub.dev/packages/rfw_gen

#### 3.2 FAIR (58.com)

- **Model:** the Fair Compiler turns Dart source into a layout DSL plus logic. `fair_ast_gen` parses with the analyzer; `fair_dsl_gen` walks the `build` method's return expression and emits JSON (FlatBuffers in production). Expressions become prefixed strings: `Text('$_counter')` becomes `#($_counter)`, `onPressed: _incrementCounter` becomes `@(incrementCounter)`, resolved on the client by regular expression. [V] https://www.besthub.dev/articles/fair-2-0-layout-dsl-generation-principles-9970e99f4d05
- **Flutter-version coupling:** bindings for SDK widgets ship as per-Flutter-version packages (`fair_version`): 1.22.6, 2.0.6, 2.5, 2.8, 2.10, 3.0, 3.3, 3.7, selected with `dependency_overrides`. Latest changelog entry is 3.10.0, dated 2023-08-15 ("Adapted to Flutter 3.10.0"). 2.7k stars. [V] https://github.com/wuba/Fair
- **Bindings [K]:** generated maps of widget name to closure that pulls named props (`props['color']`), with `@FairBinding` generating the same for app widgets. Dart logic is transpiled to JS and run in V8/JavaScriptCore. Control flow inside `build` is restricted to helper "sugar" calls. Not verified this session.
- **What stalled it:** the visible evidence is that it tracked Flutter versions one binding package at a time and stopped at 3.10 in 2023. A generated mirror of the SDK is a maintenance treadmill if the generated output is a published artefact that the framework team must regenerate, test and release per Flutter version.

#### 3.3 MXFlutter (Tencent)

- **Model:** JS classes mirror Flutter widgets with the same names (`Scaffold`, `AppBar`, `Text`). JS `build()` produces a widget-tree description that Dart renders. Callbacks are registered with `createCallbackID`. Builders are eagerly expanded in JS: for lists, `preBuild` calls the builder `childCount` times and stores the result as `children`. [V] https://besthub.dev/articles/how-javascript-powers-a-high-performance-dynamic-flutter-framework-b94c016dcf95
- **Status:** last push 2021-03-31; the repo announces it stopped updating. v0.8.0 targeted Flutter 1.20.3, v0.9.0 Flutter 1.22.3. 2.8k stars. [V] https://awesome.ecosyste.ms/projects/github.com%2Fmxflutter%2Fmxflutter
- **Lessons:** (a) a 1:1 JS mirror of Flutter's API is feasible and was the chosen design; (b) eager expansion of builders is the cheap answer and it destroys laziness, which is the point of builders; (c) it was pinned to Flutter 1.x and died there.

#### 3.4 Kraken / WebF

- **Chose DOM and CSS instead of the Flutter widget API.** QuickJS, a reimplemented DOM/CSSOM, CSS layout mapped onto Flutter render objects. "Standards First": existing web skills, frameworks and DevTools work. [V] https://openwebf.com/en/docs/learn-webf/how-it-works
- **Escape hatches are typed and generated from TS:** Flutter widgets appear as custom elements (`<flutter-cupertino-button>` "renders an actual Flutter widget, not a styled div"). Native modules are defined in a `*.module.d.ts` file; `webf module-codegen` generates Dart bindings and an npm package. [V]
- **Costs:** about 5 MB, unsupported features (Shadow DOM, floats, limited tables and grid), async layout with stale measurements. [V]
- **Lesson:** they avoided binding Flutter's API surface altogether by standardising on an API that never changes (the web platform). That is the opposite bet from solid-fuse. Their module codegen direction (TS to Dart) fits them because the Dart implementation is written afterwards; it does not fit wrapping packages that already exist.

#### 3.5 Stac (formerly Mirai) and json_dynamic_widget

- **Stac:** screens are written in a Dart DSL (`stac_core`) with a prefixed mirror of Flutter (`StacScaffold`, `StacColumn`, `StacEdgeInsets.symmetric(horizontal: 20)`, `StacColors.black`, `StacCrossAxisAlignment.start`), annotated `@StacScreen`, and "compile down to JSON". Callbacks are a closed set of action objects (`StacNavigator.pop()`). [V] https://pub.dev/documentation/stac/latest/
- **Stac custom widgets [K]:** a hand-written parser class per widget (type string, `fromJson` model via `json_serializable`, `parse` to widget), registered at init. Not verified this session.
- **json_dynamic_widget:** had an annotation-driven generator, `json_dynamic_widget_codegen`. pub.dev marks it **discontinued** (last version 4.0.1+5). [V] https://pub.dev/packages/json_dynamic_widget_codegen
- **Lesson:** both systems mirror Flutter's names and constructor shapes almost exactly, because that is what their users already know. Both restrict callbacks to data (actions), which is the limit solid-fuse does not have.

#### 3.6 dart_eval / flutter_eval

- **Model:** a Dart bytecode compiler and interpreter written in Dart. Host classes need a **wrapper** (use an existing instance from interpreted code; cannot subclass) or a **bridge** (subclass or implement from interpreted code; cannot wrap an existing instance). [V] https://pub.dev/packages/dart_eval
- **Bindgen:** `dart_eval bind` with `@Bind()` generates `*.eval.dart` wrappers and an `eval_plugin.dart` registrar; `@Bind(implicitSupers: true)` pulls in inherited members; `@Bind(bridge: true)` generates a bridge. JSON bindings need a separate serialisation step. [V]
- **Coverage:** flutter_eval lists about 133 Flutter classes, "some of these have only partial support". Compilation needs a `flutter_eval.json` that matches the installed flutter_eval version. [V] https://pub.dev/packages/flutter_eval
- **Cost:** "10-50x slower than standard AOT Dart"; many Dart features unsupported. [V]
- **Lessons:** the wrapper/bridge split is the same distinction as pigeon's `@HostApi`/`@FlutterApi` and UniFFI's object/callback-interface: *calling into* a host class and *being called as* a host class are different generated artefacts and should be different categories. Second, the binding description is a versioned file that must match the runtime; that is a manifest by another name.

#### 3.7 Hydro-SDK (closest precedent)

- **What it is:** "Author Flutter experiences in Typescript. No native bridge, no V8. Just Dart." TypeScript compiled through TypeScriptToLua, run on a Lua VM written in Dart, with built-in codepush. Stated goal: "Become React Native for Flutter." [V] https://github.com/hydro-sdk/hydro-sdk, https://chgibb.github.io/two-years-of-hydro-sdk
- **Bindings started hand-written and that failed.** The author hand-wrote Cupertino projections in 2020, then "overwhelmed myself trying to expand and maintain Flutter and Dart APIs across both Typescript and Haxe" and dropped Haxe. [V] https://hn.jakechampion.name/reader/https://chgibb.github.io/one-year-of-hydro-sdk
- **SWID** (Structured Wrapper and Interface generator for Dart, named after SWIG) automated it: "structured in a classic frontend-backend compiler design" where "Typescript and Dart both just happen to be backends", producing projections "from a Dart package". After one year it handled "large swaths of Flutter Foundation as well as Dart UI and Dart Core". Correctness was tested by porting parts of the Dart SDK CO19 conformance suite to TypeScript. [V] same page
- **The generator became the project.** SWID went from about 26.5k LOC to about 98.3k LOC during 2021 (tests from 3.7k to 34.4k). It triggered a Dart compiler bug. The hope was that it would support "the whole of Flutter" in 2022. [V] two-years post
- **Outcome:** the README still says the project "is currently only suitable for simple content" and that "a few dozen Flutter widgets are supported". The roadmap's near-term items are Flutter 2.8 and 2.10 support (late 2021, early 2022). 687–693 stars, 124–175 open issues, no releases listed. The repo was last pushed 2025-06-16 but shows no sign of having moved past that roadmap. [V] GitHub page and https://awesome.ecosyste.ms/projects/github.com%2Fhydro-sdk%2Fhydro-sdk
- **Why it stalled (my reading of the evidence, not a statement by the author):**
  1. It aimed at the whole of Dart and Flutter (`dart:core`, `dart:ui`, foundation) as the generator's target, bottom-up. After 98k lines of generator, user-visible coverage was a few dozen widgets.
  2. One person, and three hard problems at once: a VM, a binding generator, and a codepush service.
  3. Generating a *faithful* projection of Dart semantics into TS (generics, mixins, operator overloads, named constructors, subclassing Dart classes from TS) is far harder than generating a *constructor-call adapter*. Subclassing a widget from the guest language is the bridge-class problem from dart_eval and is where the complexity lives.
  4. Lua as the VM meant TS semantics were filtered through TypeScriptToLua, so neither the JS ecosystem nor JS-trained tooling applied.

#### 3.8 Shorebird (OTA comparison)

- **Model:** a Flutter engine fork with an updater; patches are Dart-only, applied on next launch; on iOS the changed code runs in Shorebird's interpreter. [V] https://docs.shorebird.dev/code-push/faq/
- **Compatibility unit:** "Each patch applies to one release version." Native code, assets and the Flutter version cannot be patched. `shorebird patch` diffs native code and assets against the release and warns. A new package with native code works only if the release already contained it. `--dart-define` values cannot change. [V]
- **Cost:** engine is about +4.67 MB on iOS arm64 and +2.58 MB on Android arm64-v8a for Flutter 3.41.7; an installed patch is roughly the size of the app's compiled Dart. [V]
- **Policy position:** cites Google Play's interpreter carve-out and Apple's interpreted-code clause (does not change primary purpose, "does not bypass signing, sandbox, or other security features of the OS"). [V]
- **Lesson:** Shorebird can patch any Dart, including adding a pure-Dart pub package, without a store release. solid-fuse cannot: a new Dart package means a new binary. The scenarios where solid-fuse OTA works are exactly those where the JS bundle only uses adapters already compiled in. That makes "what is compiled in" the central compatibility question, and it argues for compiling in somewhat more than the app uses today.

### 4. Binding generators in general

#### 4.1 pigeon (owner-supplied source)

- **Source of truth:** a Dart file of annotated abstract classes, outside `lib/`. [V] https://pub.dev/packages/pigeon
- **Explicit direction marking:** `@HostApi()` for "procedures implemented on the host platform, which Flutter calls"; `@FlutterApi()` for procedures implemented in Dart that the host calls. Streams are a third category, `@EventChannelApi`. Objects with native identity are a fourth, `@ProxyApi`. [V]
- **Version lock:** "Both sides of the communication... must be generated with the **same version** of Pigeon." Generated code is an internal detail: "breaking changes in generated code are common." [V]
- **Errors:** host exceptions become `PlatformException`; structured details through `FlutterError`/`PigeonError`. [V]
- **`@ProxyApi` [K]:** generates a Dart class per native class plus an instance manager that maps ids to instances with weak references and finalizers. This is the handle mechanism done generically (used by `webview_flutter`).
- **Lesson noted by owner:** direction is declared, not inferred. For solid-fuse: "Dart API exposed to JS" (JS calls Dart: widget constructors, controller methods) versus "interface that JS implements" (Dart calls JS: callbacks, builders, delegates, `CustomPainter`) are different generated artefacts with different failure modes, and the manifest should record which each item is.

#### 4.2 UniFFI (owner-supplied source)

UniFFI's taxonomy maps onto the four categories the earlier design chat reached:

| UniFFI | Semantics | solid-fuse analogue |
|---|---|---|
| Record (dictionary) | Plain data, copied by value across the boundary | `EdgeInsets`, `TextStyle`, `BoxDecoration`, `Color`: JSON-able value objects |
| Enum (including with data) | Closed set of variants, copied | Dart enums as string unions; sealed classes as tagged unions |
| Object (interface) | Has identity, passed by reference, methods | Handles: `ScrollController`, `AnimationController`, `FocusNode` |
| Callback interface / foreign trait | Implemented on the foreign side, called by Rust | JS callbacks, builders, delegates |

- **Lifetimes:** objects are wrapped in `Arc`; the pointer is handed out with `Arc::into_raw`, which "leaks" one reference until the foreign side calls a dedicated destructor. Method calls borrow. Objects must be `Send + Sync`. The page describes no guard against use after free; it expects the foreign binding to behave. [V] https://mozilla.github.io/uniffi-rs/0.27/internals/object_references.html
- **Where the line is drawn:** the author chooses. Nothing is inferred as an object or a record; it is declared (UDL `dictionary` versus `interface`, or derive macros). A record that contains an object holds a reference to it. [K]
- **Errors:** declared per function; an error enum becomes a typed exception in the foreign language; undeclared panics surface as a generic internal error. [K — the errors page returned a redirect stub]
- **Async:** "UniFFI supports exposing async Rust functions over the FFI"; the foreign side supplies the executor ("There's no requirement for a Rust event loop"). Foreign-implemented traits can have async methods. Cancellation is explicitly not provided: "We don't directly support cancellation in UniFFI even when the underlying platforms do." [V] https://mozilla.github.io/uniffi-rs/0.30/futures.html
- **The TypeScript binding** (`uniffi-bindgen-react-native`) documents each category separately: objects with "Garbage Collection and the Drop trait", records, enums and tagged unions, errors, callback interfaces, promises, async callback interfaces. For async callbacks it adds cancellation that core UniFFI lacks: when the Rust future is dropped early "it has been cancelled", and the generated code passes an `AbortSignal` to the TS implementation; "It is up to the implementer of each method whether they want to use it or not." [V] https://jhugman.github.io/uniffi-bindgen-react-native/toc.html, https://jhugman.github.io/uniffi-bindgen-react-native/idioms/async-callbacks.html
- **Lessons:**
  1. The four categories are sound and independently arrived at by several systems (UniFFI, pigeon's four annotations, dart_eval's wrapper/bridge). Adopt them as the manifest's vocabulary.
  2. The classification must be recorded explicitly, with a default heuristic and an override. Dart does not mark which classes are values. A heuristic (immutable class with const constructor and `==` override is a record; `ChangeNotifier`/`Listenable`/has `dispose()` is an object; function-typed parameter or abstract class with only methods is a callback interface) will be right most of the time and wrong for some, so it must be overridable per type.
  3. Lifetime needs a decision: UniFFI leans on foreign GC plus explicit destroy. QuickJS has `FinalizationRegistry` in recent versions, but relying on JS GC to dispose a Dart `AnimationController` is the jnigen experience (below). Tie handle lifetime to the owning Solid reactive scope, with explicit `dispose()` as a fallback.
  4. Sync versus async is part of the contract, as is cancellation; decide them per category instead of per call site.

#### 4.3 flutter_rust_bridge (owner-supplied source; already used by `fjs` in this repo)

- **Opaque types:** "Use arbitrary Rust and Dart types without manual intervention, even if they are not serializable or non-clone", implemented by "generating wrappers and raw Arc pointers". [V] https://github.com/fzyzcjy/flutter_rust_bridge
- **Sync and async:** "Async Dart to avoid blocking the main thread, sync Dart for places needed (e.g. Widget.build)", opt-in with `#[frb(sync)]`. [V]
- **Streams:** a `StreamSink<T>` parameter on the Rust function becomes a Dart `Stream`. [V]
- **Callbacks:** Rust can call Dart closures (`impl Fn(String) -> bool`). [V]
- **Third-party crates:** "Scan and use existing Rust packages in Dart (experimental)", plus "mirror" types so external types can be used "without redefining and copying". [V]
- **Version check, verified in this repo:** frb's generated Dart contains `codegenVersion` and `rustContentHash`, checked at init against the compiled Rust side. In this repo: `packages/solid-fuse/dart/lib/src/fjs/lib/src/frb/frb_generated.dart` lines 75 and 78 (`codegenVersion => '2.12.0'`, `rustContentHash => 1608407051`). [V, local file]
- **Lessons:** default to opaque (a handle) when a type cannot be classified as a record; it is always correct, only slower. Make sync an explicit opt-in. The `rustContentHash` check is a working example, inside this repo, of the manifest-hash idea in Part 2 section 5.

#### 4.4 ffigen and jnigen (owner-supplied source)

- **ffigen:** config in YAML (or `pubspec.yaml`), required `output` and `headers`; include/exclude by regular expression per declaration kind, where "exclude overrides include"; an excluded struct is still generated if an included declaration depends on it, optionally as an opaque type (`dependency-only: opaque`); regex renames. [V] https://dart.googlesource.com/native.git/+show/7592ecb7/pkgs/ffigen/README.md
- **jnigen:** a config script (`tool/jnigen.dart`) names the classes, packages or JAR/AAR to wrap; "If the native API changes, update your configuration script and regenerate the bindings." [V] https://docs.flutter.dev/interop/jnigen.md
- **jnigen's stated limitations are all lifetime and threading:** a hard limit of 50,000 active global references; "Call `.release()` or use `.using()` blocks to prevent memory leaks"; `WeakReference` needed to break cycles between the two GCs; Dart `is`/`as` do not check the Java runtime type; `DoubleReleaseError` and `UseAfterReleaseError` are hard to track down. [V]
- **Generated output is committed [K]:** both tools write Dart files into the package and the convention is to commit them, so consumers do not need clang or a JDK.
- **Lessons:** (a) the config file with include/exclude, dependency-driven inclusion and opaque fallback is the right shape for `fuse add`; (b) raw generated bindings over a GC boundary push lifetime bugs onto the user. The Dart team's own guidance is to wrap generated bindings in a hand-written idiomatic API (`cronet_http` over jnigen bindings), which is the raw-plus-curated pattern.

#### 4.5 wasm-bindgen / web-sys

- **Generated from a standard IDL:** "procedurally generated crate from browser WebIDL"; `build.rs` runs the WebIDL frontend over `webidls/enabled`. [V] https://wasm-bindgen.netlify.app/contributing/web-sys/overview
- **Feature flags per type:** "Due to the very large number of APIs, this crate uses features to enable portions of its API to reduce compile times." Each type has its own feature; methods document which features they need. [V]
- **Layering [K]:** `web-sys` and `js-sys` are raw and unergonomic by design; `gloo` and framework crates provide the ergonomic layer. Unstable APIs are behind a separate cfg flag so they can break without a semver bump.
- **Lesson:** a very large generated surface is manageable when it is opt-in per type and the opt-in is transitive. The known pain is discoverability: users repeatedly hit "method not found" because a feature is off. For agents that failure needs an error that names the fix.

#### 4.6 GObject Introspection

- **One metadata format, many bindings [K]:** C libraries are scanned into `.gir` XML, compiled to binary `.typelib`; Python, JavaScript (GJS), Rust, Vala and others consume the same metadata. What the scanner cannot infer from C signatures is supplied by annotations in doc comments: `(transfer full|none|container)`, `(nullable)`, `(element-type)`, `(out)`, and for callbacks `(scope call|async|notified)` plus `(closure)` and `(destroy)`. The callback scope annotation states how long the callee keeps the function: for the duration of the call, until called once, or until a destroy notification.
- **Overrides are discouraged, on purpose:** "overrides should be minimized and preference should always be placed on updating the underlying API to be more bindable." Do not change signatures or add defaults, because that "creates a mismatch between the library API and its Python version". Prefer adapters over overriding: "An adapter allows more flexibility and less dependency on overrides", so developers can use the raw API without worrying whether overrides are installed. Class overrides cost load time. [V] https://pygobject.gnome.org/devguide/override_guidelines.html
- **gtk-rs [K]:** generated code lives in `src/auto/` and is committed; hand-written code lives beside it; a `Gir.toml` per crate lists what to generate, what to ignore, and per-function overrides (nullability, renames, "manual").
- **Lessons:**
  1. The metadata file, not the generated code, is the product. Generate a manifest once from the analyzer; generate TS types, Dart adapters, docs and the compatibility hash from the manifest.
  2. The things a scanner cannot infer are few and always the same: ownership, nullability beyond the type system, element types, and callback lifetime. Dart's type system gives nullability and element types. It does not give callback scope (called during build, or retained) or ownership of controllers. Those are the annotations solid-fuse's override file needs.
  3. Curated layers should be *adapters over* the raw layer, not *edits to* it. The raw layer stays mechanically predictable.

#### 4.7 Smaller notes

- **ts-rs, tsify, specta [K]:** derive TS types from the implementing language's types (Rust structs) at build or test time. Types cannot drift because nobody writes them. Limitation: they cover data shapes, not behaviour.
- **Kotlin/JS dukat [K]:** converted TypeScript `.d.ts` to Kotlin declarations automatically. It was deprecated and its Gradle integration removed; the community moved to curated `kotlin-wrappers` (which use their own generator plus manual fixes). The failure was type-system mismatch: TS unions, overloads, structural types and mapped types have no Kotlin equivalent, so output frequently did not compile or was typed `dynamic`. Search results confirm the tool's existence and user disappointment but I did not fetch a deprecation notice. **Lesson:** automatic conversion works when the target type system is at least as expressive as the source. Dart to TS is the favourable direction (TS can express nearly everything Dart can: nullability, generics, named parameters as object types, enums as unions, sealed classes as tagged unions). TS to Dart would not be.
- **PyO3 [K]:** Rust extensions historically shipped without `.pyi` stubs or with hand-written ones; generation arrived late through third-party tools and an experimental introspection feature. Hand-written types as an afterthought drift; same story as Expo before `expo-type-information`.

### 5. OTA: policy and compatibility

#### 5.1 Store policy

- **Apple, App Review Guideline 2.5.2:** apps may not "download, install, or execute code which introduces or changes features or functionality of the app". **Developer Program License Agreement (the interpreted-code clause, cited as 3.3.2, 3.3.1(B) or 3.3(b) depending on agreement version):** "Interpreted code may be downloaded to an Application but only so long as such code:" does not change the app's primary purpose with features inconsistent with its advertised purpose, does not create a store or storefront for other code or apps, and does not bypass signing, sandbox, or other OS security features. [V via secondary source] https://bitrise.io/blog/post/what-app-stores-allow-with-ota-updates-apple-and-google-policy-explained ; Shorebird cites the same clause as 3.3.1(B) https://docs.shorebird.dev/code-push/faq/
- **Enforcement examples:** Rollout.io (March 2017), removed for swizzling the Objective-C runtime and calling private APIs. In early 2026 Apple blocked updates to Replit and Vibecode and pulled another app, described as apps that "generated and executed code that changed their own behavior at runtime, outside review". [V via the Bitrise article; I did not corroborate the 2026 events against a second source]
- **Google Play, Device and Network Abuse policy:** an app "may not modify, replace, or update itself using any method other than Google Play's update mechanism" and "may not download executable code (such as dex, JAR, .so files) from a source other than Google Play", but "This restriction does not apply to code that runs in a virtual machine or an interpreter where either provides indirect access to Android APIs (such as JavaScript in a webview or browser)." [V via the same article and Shorebird's FAQ]
- **Reading for solid-fuse:** JS in QuickJS driving a fixed set of compiled Flutter adapters is on the permitted side on both stores, in the same position as React Native with CodePush or EAS Update. Two cautions. First, the more general the bridge (arbitrary Dart API reachable from downloaded JS), the closer it gets to "bypass ... security features" arguments and to the 2026 enforcement pattern; a closed, enumerable adapter manifest is the defensible position. Second, the policy constrains *what the update does* (no change of primary purpose), which no framework design can guarantee on the app author's behalf.

#### 5.2 Expo EAS Update

- **Runtime version:** "a property that guarantees compatibility between a build's native code and an update." [V] https://docs.expo.dev/eas-update/runtime-versions.md
- **Policies:** `appVersion` (only correct if you bump the app version on every native change), a manual string (you must remember), and `fingerprint`, which changes "whenever anything that may impact the native runtime changes" and "gives the strongest protection against incompatible updates, but requires more frequent builds". [V]
- **Failure mode when wrong:** an update "calls missing native code"; `expo-updates` "may detect an error and attempt to roll back", but only when it recognises the error. [V]
- **`@expo/fingerprint`:** hashes the inputs that affect the native build (config files, native directories of autolinked packages, each with a recorded reason) into one hash; supports a `.fingerprintignore`; can diff two fingerprints and list what changed and why. Also used to "rebuild the native app only when it's really needed" in CI. [V] https://expo.dev/blog/fingerprint-your-native-runtime.md
- **Weakness:** the fingerprint hashes *inputs* to the native build, so it is conservative. Any change to a native dependency, including a patch release that changes no API, yields a new runtime version and strands the old binaries.

#### 5.3 CodePush

- **Target binary version [K, standard documented behaviour; the Microsoft page I fetched has been reduced to an App Center retirement hub]:** each release names a semver range of app binary versions it applies to (`1.2.3`, `~1.2.3`, `^1.2.3`, `1.2.x`). Correctness depends entirely on the developer bumping the binary version when native code changes. This is Expo's `appVersion` policy with a range.

### 6. Agent-centric DX evidence

- **Types as a constraint reduce errors.** Type-constrained decoding "reduces compilation errors by more than half" and "significantly increases functional correctness" across synthesis, translation and repair, demonstrated on TypeScript. [V] https://arxiv.org/abs/2504.09246 . This is evidence about constraining generation, not about agents reading `tsc` output, but the direction is the same: a tighter type surface removes a large class of errors.
- **Familiar APIs versus unfamiliar APIs, measured.** On CloudAPIBench, GPT-4o invoked only 38.58% of *low-frequency* APIs correctly. Adding documentation raised that to 47.94%. For *high-frequency* APIs, adding retrieved documentation with a sub-optimal retriever caused a 39.02 percentage-point drop. The authors recommend retrieving documentation only for APIs the model does not already know. [V] https://arxiv.org/abs/2407.09726
  - Reading: models are reliable on APIs they saw often in training and poor on rare ones; documentation helps the rare ones only partially and can hurt the common ones. An invented "friendlier" API is by definition a zero-frequency API. Flutter's widget API is a high-frequency one.
- **Always-present, version-matched docs beat on-demand retrieval.** Vercel's Next.js evals: baseline 53%, a skill 53% (not invoked in 56% of cases), a skill with explicit instructions 79%, an `AGENTS.md` docs index 100%. The index was compressed from about 40 KB to 8 KB with no loss; an index pointing at retrievable files worked as well as inlined docs. The key line was "Prefer retrieval-led reasoning over pre-training-led reasoning". [V] https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- **Next.js productised this:** docs matching the installed version ship inside the package at `node_modules/next/dist/docs/`; `next dev` writes a managed block into `AGENTS.md` that opens with "This is NOT the Next.js you know"; every docs page has a `.md` URL and an `llms.txt` index; errors print labelled fixes ("Ways to fix this: [stream] ... [cache] ... [block] ...") with a link to a per-error page "written for agents to read"; browser console errors are forwarded to the terminal; an MCP endpoint reports compilation issues without a full build. [V] https://nextjs.org/docs/app/guides/ai-agents
  - solid-fuse already ships Solid 2.0 docs in `dist/docs/solid-2.0/`, which is this pattern.
- **Very large type surfaces degrade tooling.** NativeScript removed platform typings from the default set because the language service indexes and loads them all. [V] section 2. No study I found measures agent success against surface size directly; the inference is that agents pay for surface size in context when they read `.d.ts` files and in `tsc` latency in their edit-check loop.
- **Generated code location matters to tools.** Prisma generated its client into `node_modules`, where "tools expect [the folder] to be immutable": the TS language server did not see changes and needed an extension to restart it; monorepos and Docker needed workarounds. Prisma 7 requires an explicit `output` in the source tree so that "The generated code is treated like regular application code." [V] https://www.prisma.io/blog/why-prisma-orm-generates-code-into-node-modules-and-why-it-ll-change
- **Convex (owner-supplied source):** a `convex/_generated/` directory (`api.d.ts`, `dataModel.d.ts`, `server.d.ts`) produced by `npx convex dev`, which regenerates on change. Guidance: "Check this folder in to your git repo", so code typechecks without running codegen. Validators (`v.object(...)`) on public functions give both the static type and a runtime check: "Argument validation prevents malicious users from calling your functions with the wrong types of arguments." [V] https://docs.convex.dev/generated-api, https://docs.convex.dev/understanding/best-practices/other-recommendations
- **Zod / Valibot (owner-supplied source) [K]:** one schema definition yields the static type (`z.infer`) and the runtime validator, so they cannot disagree. Valibot's contribution is a modular, tree-shakeable design so the validator cost is proportional to the schemas used; that matters in a QuickJS bundle. Both implement the Standard Schema interface.
- **Prisma (owner-supplied source):** one schema, `prisma generate`, and a schema change shows up as type errors at every affected call site. "You need to re-generate Prisma Client after every database schema change" was the main source of stale-client bugs. [V] same Prisma post

---

## Part 2 — Lessons for solid-fuse

### 1. Dart is the source of truth. Generate from the resolved analyzer model into a manifest, and everything else from the manifest.

RN and Nitro put the spec in TS because they have several native implementations and the spec is written before them. solid-fuse has one native language and wraps APIs that already exist, which is Expo's and NativeScript's situation; both ended up generating TS from native. Expo's generator is weak because it parses Swift syntax. Dart's `analyzer` gives resolved element models, so this is the one place where solid-fuse has a real advantage over every precedent listed.

Follow GObject Introspection's structure: analyzer to a **manifest** (JSON, one per package), then manifest to TS `.d.ts`, Dart adapters, per-widget docs, and the compatibility hash. Hydro-SDK's SWID had this compiler shape too; it failed on scope, not on architecture.

### 2. Generate constructor-call adapters, not a projection of Dart.

Hydro-SDK spent 98k lines of generator and reached "a few dozen widgets" because it tried to project Dart itself (core, ui, foundation, subclassing) into another language. flutter_eval sits at about 133 classes with partial support for the same reason.

solid-fuse's unit of generation is much smaller: *a widget is a constructor with named parameters*. Generate, per widget, a function that reads props and calls the constructor. Do not attempt to let JS subclass Dart classes, call arbitrary static methods, or use mixins. The bridge-class problem (JS implementing a Dart abstract class such as `CustomPainter` or `SliverChildDelegate`) should be a separate, explicitly opted-in category with hand-written adapters at first.

### 3. Adopt the four categories, declare direction, and make classification overridable.

UniFFI, pigeon and dart_eval converge on the same split. Use it as the manifest vocabulary:

| Category | Direction | Wire form | Lifetime |
|---|---|---|---|
| Record (value) | JS to Dart, copied | JSON object, `{ $ctor: 'symmetric', horizontal: 8 }` for named constructors | none |
| Enum | JS to Dart, copied | string literal union; sealed classes as tagged unions | none |
| Object (handle) | JS calls Dart, by reference | handle id plus RPC | tied to the owning Solid scope; explicit `dispose()` |
| Callback interface | Dart calls JS | callback id; sync or async declared | declared scope: `call`, `retained` |

Specific points taken from the precedents:

- **Classification is a heuristic with an override**, as in UniFFI (declared) and ffigen (`dependency-only: opaque`). When in doubt, fall back to a handle, as flutter_rust_bridge does with opaque types.
- **Record callback scope**, GObject's `(scope call|async|notified)`. A `builder` invoked synchronously during layout, an `onTap` retained for the widget's life, and a `Future`-returning `onRefresh` are three different contracts. The Dart type alone does not distinguish the first two.
- **Sync builders are the hard case** and every precedent that avoided the problem paid for it: rfw and Stac forbid closures, MXFlutter eagerly expands list builders and loses laziness. Decide this deliberately; it determines whether `ListView.builder` is real.
- **Cancellation**: UniFFI core has none and the React Native binding had to add `AbortSignal`. Decide up front how an async callback is cancelled when its widget unmounts.
- **Lifetimes**: jnigen's documented problems are all leaks, double release and use after release. Do not hand raw handle lifetimes to the user or the agent. Solid's ownership tree already knows when a scope dies; use it.

### 4. Raw generated layer plus a thin curated layer, where curated means adapters, not edits.

This pattern recurs everywhere: web-sys under gloo, jnigen bindings under `cronet_http`, GI typelibs under PyGObject overrides, NativeScript raw access under plugins, kotlin-wrappers after dukat.

PyGObject's guidance is the part to copy: keep overrides minimal, never change signatures in the raw layer, and prefer adapters so the raw API always remains usable and predictable. For solid-fuse:

- The raw layer mirrors Flutter exactly and is fully mechanical.
- An **override file** (the `Gir.toml` analogue, committed, per package) holds what the analyzer cannot know: category overrides, callback scopes, exclusions, renames to resolve collisions, and "manual" markers for widgets with hand-written adapters.
- A hand-written adapter replaces a generated one by name. It never patches generated output.
- The curated layer is small and exists only where the mirror is bad in JS (controllers bound to signals, text input, navigation). The existing hand-written widgets become that layer.

### 5. Mirror Flutter 1:1 in the JS API. Do not invent a friendlier API.

This is the question with the most direct evidence:

- Models are far more accurate on APIs seen often in training (38.58% correct on low-frequency APIs for GPT-4o; documentation only lifts that to 47.94%). An invented API is the lowest-frequency API possible.
- MXFlutter, Stac, FAIR and rfw all chose Flutter's names and parameter shapes, for human users, for the same reason.
- A mirrored API also makes the generator trivial to explain and its output predictable: `<Container padding={EdgeInsets.all(8)} decoration={{...}}>` is guessable from Flutter knowledge alone.

Where JSX forces a difference, keep the rule mechanical and uniform so it can be stated in one paragraph of `AGENTS.md`: `child`/`children` become JSX children; named constructors become static factories or a `$ctor` tag; `Widget`-typed parameters other than `child` (for example `leading`, `title`) are props that accept JSX; controllers follow one handle rule. Every exception to the mirror is a place where the agent's Flutter prior is wrong, so each one needs a typed error, not only a doc line.

The risk on this side: a faithful mirror imports Flutter's verbosity and its nesting (`Padding` inside `Center` inside `Container`). That is acceptable for agents. If a friendlier layer is wanted later it can be an adapter layer on top (lesson 4) without changing the raw layer.

### 6. The surface must be an allow-list, opt-in per package and per type, with transitive closure.

- NativeScript's "everything" model needs runtime reflection that Flutter AOT does not have. Every adapter is real compiled Dart that references a constructor and so defeats tree shaking for that widget. Binary size scales with the manifest.
- NativeScript retreated from loading all typings; web-sys gates every type behind a feature.
- So `fuse add some_pub_package` should take or infer a list of entry types, pull in dependencies transitively (ffigen's dependency rule), and write that selection to the committed override/config file. A sensible default is the package's exported widgets plus the value types their constructors mention.
- The failure mode to design for is web-sys's: something exists in Flutter but is not in the manifest. In dev mode the error should say exactly which command adds it, because an agent will act on that.
- Measure early: adapter count against AOT binary size and against `tsc` time. No source here gave numbers for this, including NativeScript's own docs.

### 7. Commit generated output, in the app's source tree, and keep it fresh with a watcher.

- Convex: `_generated/` is committed so the project typechecks without running codegen. Nitro ships generated code in the package for the same reason. gtk-rs commits `src/auto/`.
- Prisma: generating into `node_modules` broke language servers, monorepos and Docker; they moved to an explicit in-tree output.
- RN's opposite choice (regenerate at every app build) is one of its most common complaints.

So: TS types and the manifest go in a visible, committed folder in the consumer app (for example `fuse/_generated/`), not in `node_modules` and not in `dist/`. Generated Dart adapters go in the Flutter app's `lib/`. Diffs to generated files are then reviewable, and an agent sees a Flutter upgrade as a concrete diff plus type errors at call sites, which is Prisma's upgrade-safety story.

Version the output against its inputs the way pigeon and flutter_rust_bridge do: stamp generator version and input hash into both the Dart and TS outputs and fail fast at startup when they disagree. This repo already has the pattern in `frb_generated.dart` (`codegenVersion`, `rustContentHash`).

**Framework-shipped versus app-generated.** FAIR shipped one binding package per Flutter version and stopped at 3.10. Do not publish generated Flutter SDK bindings as a framework artefact that must be re-released per Flutter version. Generate in the consumer's project against the consumer's installed Flutter SDK and package versions. The framework ships the generator and the override files for the SDK.

### 8. OTA: the runtime version is a hash of the adapter manifest, and compatibility should be checked as a subset, not as equality.

Expo's fingerprint hashes native *inputs* and is therefore conservative: any native change strands old binaries. solid-fuse can do better because its native surface is an explicit, enumerable contract.

- **Binary side:** the manifest compiled into the app (every adapter: type name, prop names and types, handle methods, callback signatures, plus bridge protocol version). Its hash is the runtime version in Expo's sense.
- **Bundle side:** at build time, record the subset of the manifest the JS bundle actually references (the bundler can see which generated wrappers are imported; prop usage is visible in the JSX transform output).
- **Compatibility rule:** a bundle is compatible with a binary if the bundle's required set is a subset of the binary's manifest with matching signatures. This is strictly more permissive than equality: adding a widget to the binary does not strand old bundles, and a new bundle that uses only old adapters can go to old binaries.
- **Practical form:** ship the equality check first (hash of manifest as runtime version, like `rustContentHash`), since it is trivially correct, and add the subset check as an optimisation when binary churn starts to hurt.
- **Verify at load time on the device too**, before running the bundle. Expo's rollback only triggers when an error is recognised; a missing adapter discovered mid-render is the failure to avoid.
- **Caveat:** the manifest captures the *interface* of adapters, not the behaviour of the Flutter version behind them. Include the Flutter SDK version and package versions in the runtime version, or accept that a bundle may meet different widget behaviour on different binaries.
- **Consequence from the Shorebird comparison:** since a new Dart package always needs a store release, there is value in compiling in a broader adapter set than the app uses today (the full core/Material set, say), trading binary size for OTA headroom. That is a product decision that should be made with the size numbers from lesson 6.
- **Policy:** a closed adapter manifest is also the defensible position under Apple's interpreted-code clause and the 2026 enforcement pattern. A general "call any Dart API from downloaded JS" bridge is not something to build.

### 9. Build caching falls out of the manifest.

`@expo/fingerprint` is also used to skip native rebuilds. Same here: if the manifest hash is unchanged, no Dart changed, so a JS-only change needs neither codegen nor a Flutter build. Key the generator on (Flutter SDK version, `pubspec.lock`, override files, generator version) so `fuse dev` can skip it entirely on most starts.

### 10. Use build-time knowledge in the generated Dart (the Nitro lesson).

Since the generator knows each widget's props at build time, generated adapters should not do string-keyed map lookups per prop per rebuild. Options, in increasing effort: a generated `switch` over interned prop ids in `setProp`; a positional prop array per node type with slot indexes baked into both the TS wrapper and the Dart adapter; typed fields on a generated node subclass. The manifest fixes slot order, which is another reason both sides must be generated from the same manifest and checked by hash. Measure before going beyond the `switch`; Nitro's own benchmark is labelled an extreme case.

### 11. A Convex-like dev loop and boundary validators for solid-fuse

**The loop.**

1. `fuse dev` starts a watcher on `pubspec.yaml`, `pubspec.lock`, the override/config file, and (for app-local widgets) annotated Dart files.
2. On change it re-runs the analyzer step for affected packages only, rewrites the manifest, the TS types and the Dart adapters under `_generated/`, and prints a short diff summary: widgets added, props added, props removed, types changed.
3. TS type errors from removed or changed props appear in the agent's normal `tsc` loop at the exact call sites.
4. If the manifest hash changed, the running app's binary is stale. Say so explicitly ("native surface changed: restart required", or trigger the Flutter rebuild) instead of letting the JS hot-reload against an old binary. If it did not change, hot-reload JS only.
5. `fuse add <package>` is: `flutter pub add`, choose entry types, write them to the config file, run the generator, print the list of new JSX elements with their import path. One command, with output that an agent can paste from.
6. `fuse check` (CI and pre-commit) regenerates into a temp directory and fails if the committed `_generated/` differs. Nitro's "if you forget to run Nitrogen" problem is solved by a check, not by discipline.

**Boundary validators.** Zod, Valibot and Convex's `v` show the pattern: one definition yields the static type and the runtime check. Here the "one definition" is the manifest entry, which already exists.

- **Dart side (always on, cheap):** generated prop readers validate while decoding, as Expo Modules does ("full knowledge of the argument types the native function expects"). On mismatch they produce a structured error rather than rfw's silent `null`: widget type, prop, expected type, received value, and the JSX source location if the dev transform recorded it.
- **JS side (dev only):** generate a compact validator table from the manifest and check props before they cross the bridge, so the error carries a JS stack. Strip it in production builds; Valibot's argument about paying only for what is used applies to a QuickJS bundle.
- **Why validate when TS already checks:** agents write `as any`, values arrive from JSON and network responses, and an OTA bundle can meet a binary it was not compiled against. The boundary is where all three are caught.
- **Error text as an interface.** Follow Next.js: stable error codes, labelled fixes, a pointer to a doc file that ships in the package. For example:

  ```
  FUSE1203 <Container> prop "padding": expected EdgeInsets, got number (8)
    at src/screens/Home.tsx:42:18
  Ways to fix:
    - [value]  padding={EdgeInsets.all(8)}
    - [object] padding={{ left: 8, top: 8, right: 8, bottom: 8 }}
  Docs: node_modules/solid-fuse/dist/docs/errors/FUSE1203.md
  ```

  And for the allow-list miss from lesson 6:

  ```
  FUSE1101 <Shimmer> is not in this app's adapter manifest.
  Ways to fix:
    - [add] fuse add shimmer --widget Shimmer   (requires a native rebuild)
  ```

### 12. Agent DX beyond types

- **Carry Dart doc comments into the generated `.d.ts`** as TSDoc. They are the documentation the agent already half-knows, and they arrive through the tool it already uses (hover, go-to-definition, reading the `.d.ts`).
- **Per-package `.d.ts` files with a small index**, not one giant file. Agents read files; NativeScript's experience says tooling pays for volume. A one-line-per-widget index (name, import path, one-sentence summary) is the equivalent of Vercel's 8 KB compressed docs index.
- **Ship version-matched docs in the package and point `AGENTS.md` at them.** Vercel's result (53% to 100%) is the strongest single DX number in this survey, and solid-fuse already ships Solid docs under `dist/docs/`. Have `fuse dev`/`fuse link` maintain a managed block in the consumer's `AGENTS.md` that states the mirror rule from lesson 5 and its exceptions, the location of `_generated/`, and the `fuse add` workflow.
- **Selective documentation.** The CloudAPIBench result says extra documentation can hurt on APIs the model already knows. So document the *differences from Flutter* prominently and leave the mirrored 95% to the `.d.ts`. Do not paraphrase Flutter's docs into a parallel doc set.
- **Forward runtime errors to the terminal** in structured form (Next.js forwards browser console errors). In solid-fuse the Dart-side validation errors and Flutter framework errors must reach the place the agent reads.
- **Build evals for the cases outside training data**, as Vercel advises: the JSX exceptions to the mirror, handles, builders, `fuse add`. Those are where a Flutter prior misleads.

### 13. Precedents that failed, and the cause in one line each

| System | Outcome | Cause to avoid |
|---|---|---|
| Hydro-SDK | 98k-line generator, "a few dozen widgets", stuck at Flutter 2.x | Projected all of Dart instead of constructor adapters; VM + generator + codepush at once |
| MXFlutter | Stopped 2021 at Flutter 1.22 | Mirror pinned to a Flutter version; eager builders |
| FAIR | Last adaptation Flutter 3.10 (2023) | Framework-published bindings per Flutter version |
| json_dynamic_widget_codegen | Discontinued | (cause not established this session) |
| Kotlin dukat | Deprecated | Source type system more expressive than target |
| RN codegen | Works, widely disliked | Custom spec parser with a type subset; regeneration at app build |
| Expo (pre SDK 56) | Works, types drift | Hand-written TS beside native definitions |
| NativeScript full typings | Rolled back from default | Volume degraded editor and compile |
| Prisma client in `node_modules` | Moved in v7 | Generated code where tools expect immutability |

### 14. Open questions this survey does not answer

1. Binary size per adapter and `tsc`/language-server cost per thousand generated types. No source gave numbers. Needs measuring in this repo.
2. Synchronous builders across the QuickJS boundary. No precedent solved it well; rfw, Stac and MXFlutter all avoided it.
3. How well classification heuristics (record versus handle) hold up across real pub.dev packages. Worth a spike over the top 50 UI packages before committing to the override-file format.
4. Generic widgets (`DropdownButton<T>`, `FutureBuilder<T>`): how `T` crosses a JSON bridge. Hydro-SDK's history suggests generics are where generators balloon.

---

## Verification gaps

- **FAIR:** `@FairBinding`, the generated binding map format, the "sugar" control-flow restrictions and JS runtime details are from background knowledge. The English guide page I reached was only an introduction. Verified: analyzer-based DSL generation, per-Flutter-version `fair_version` packages, last release 3.10.0 (2023-08-15).
- **MXFlutter:** whether its JS mirror classes were hand-written or generated was not stated in the article I read. Status and Flutter versions verified through a repository metadata mirror, not GitHub directly.
- **Hydro-SDK:** SWID's internal pipeline (analyzer to IR to backends) is described only at a high level in the posts I could read. The "why it stalled" list is my inference from the README, the roadmap and the LOC figures; the author has not published a post-mortem that I found. One GitHub fetch was rate-limited and succeeded on retry.
- **rfw "why no generator":** I did not find an explicit statement; the reasoning given is inferred from the README's framing and backwards-compatibility stance.
- **Stac custom widget registration and json_dynamic_widget's generator internals:** not verified; the pub.dev pages reached did not contain them. Only the generator's discontinued status is verified.
- **UniFFI:** the errors page and the unversioned object-references page returned redirect stubs. Error modelling and the declared-not-inferred classification are from background knowledge. Lifetimes (0.27 page) and async (0.30 page) are verified. The individual type-mapping pages of `uniffi-bindgen-react-native` were not fetched apart from async callbacks; the table of contents was.
- **pigeon `@ProxyApi` internals, GObject Introspection annotations and gtk-rs layout, web-sys unstable-API flag and gloo, ts-rs/tsify/specta, PyO3 stubs, dukat deprecation details, Zod/Valibot specifics:** background knowledge. Search results confirmed existence and general direction only.
- **Apple and Google policy text:** quoted through Bitrise's and Shorebird's pages, not from Apple's or Google's own documents. The DPLA clause number varies by source (3.3.2, 3.3.1(B), 3.3(b)). The early-2026 enforcement events come from one secondary source.
- **CodePush target binary version:** the Microsoft Learn page now resolves to an App Center retirement hub; the description is standard documented behaviour recalled from before retirement.
- **flutter_rust_bridge watch mode and commit guidance:** not on the README. The content-hash check is verified against the vendored generated file in this repo.
- **Agent DX:** I found no controlled study of agent success against API surface size, and none comparing a Flutter-mirroring JS API with an invented one. Lesson 5 rests on the API-frequency result (a single-call cloud API benchmark, not UI code) and on what four comparable systems chose.

## Sources

React Native family
- https://reactnative.dev/docs/next/the-new-architecture/what-is-codegen
- https://docs.expo.dev/modules/overview/
- https://docs.expo.dev/modules/design.md
- https://docs.expo.dev/modules/type-generation-reference.md
- https://nitro.margelo.com/docs/comparison
- https://nitro.margelo.com/docs/what-is-nitro

NativeScript
- https://docs.nativescript.org/guide/metadata
- https://docs.nativescript.org/guide/native-code/generate-typings
- https://blog.nativescript.org/where-did-my-types-go

Flutter dynamic UI
- https://pub.dev/packages/rfw
- https://pub.dev/packages/rfw_gen
- https://github.com/wuba/Fair
- https://www.besthub.dev/articles/fair-2-0-layout-dsl-generation-principles-9970e99f4d05
- https://besthub.dev/articles/how-javascript-powers-a-high-performance-dynamic-flutter-framework-b94c016dcf95
- https://awesome.ecosyste.ms/projects/github.com%2Fmxflutter%2Fmxflutter
- https://openwebf.com/en/docs/learn-webf/how-it-works
- https://pub.dev/documentation/stac/latest/
- https://pub.dev/packages/json_dynamic_widget_codegen
- https://pub.dev/packages/dart_eval
- https://pub.dev/packages/flutter_eval
- https://github.com/ethanblake4/dart_eval/wiki/Bridge-classes
- https://github.com/hydro-sdk/hydro-sdk
- https://chgibb.github.io/two-years-of-hydro-sdk
- https://hn.jakechampion.name/reader/https://chgibb.github.io/one-year-of-hydro-sdk
- https://awesome.ecosyste.ms/projects/github.com%2Fhydro-sdk%2Fhydro-sdk
- https://docs.shorebird.dev/code-push/faq/

Binding generators
- https://pub.dev/packages/pigeon
- https://mozilla.github.io/uniffi-rs/0.27/internals/object_references.html
- https://mozilla.github.io/uniffi-rs/0.30/futures.html
- https://jhugman.github.io/uniffi-bindgen-react-native/toc.html
- https://jhugman.github.io/uniffi-bindgen-react-native/idioms/async-callbacks.html
- https://github.com/fzyzcjy/flutter_rust_bridge
- https://dart.googlesource.com/native.git/+show/7592ecb7/pkgs/ffigen/README.md
- https://docs.flutter.dev/interop/jnigen.md
- https://wasm-bindgen.netlify.app/contributing/web-sys/overview
- https://pygobject.gnome.org/devguide/override_guidelines.html

OTA
- https://bitrise.io/blog/post/what-app-stores-allow-with-ota-updates-apple-and-google-policy-explained
- https://docs.expo.dev/eas-update/runtime-versions.md
- https://expo.dev/blog/fingerprint-your-native-runtime.md

DX and agents
- https://arxiv.org/abs/2504.09246
- https://arxiv.org/abs/2407.09726
- https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- https://nextjs.org/docs/app/guides/ai-agents
- https://docs.convex.dev/generated-api
- https://docs.convex.dev/understanding/best-practices/other-recommendations
- https://www.prisma.io/blog/why-prisma-orm-generates-code-into-node-modules-and-why-it-ll-change
