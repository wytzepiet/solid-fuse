# 07 — Objects, callback interfaces and non-UI plugin APIs

Spike code: `experiments/interop/objects/` (standalone Flutter package; `./run.sh` reproduces everything below in about 5 minutes). Analyzer 14.7.0, Flutter 3.50.1, TypeScript 6.0.2, solid-js 2.0.0-beta.14. Nothing outside `experiments/interop/objects/` and this file was written.

## Verdict

1. **Objects generate.** One emitter produces a Dart `FuseHandle` subclass and a typed TS factory from a class's resolved API. Run on `ScrollController`, `ScrollPosition`, `FocusNode`, `TextEditingController`, `PageController`, `AnimationController`, `TabController` and, from pub.dev, `VideoPlayerController` and `MobileScannerController`. Generated Dart analyzes clean, generated TS passes `tsc --strict` against the real `packages/solid-fuse/src`, 22 Flutter tests drive the handles through `call` against the real controllers, and 6 bun tests execute the generated TS against the real `handle.ts`, `renderer.ts` and `channels.ts`.
2. **What must be declared by hand is small and is exactly what the audit predicted**: which getters to mirror (one line per plain `ChangeNotifier`; zero for a `ValueNotifier`), an optional guard, and exclusions for framework-internal methods. The declaration for the eight controllers is 29 lines of JSON. `vsync` needs no declaration: it is recognised by type and supplied by the handle.
3. **Non-UI plugin APIs generate by the same rules.** Six packages, unassisted: 176 of 185 public callable members (95 %) bridged; all generated Dart analyzes, all generated TS typechecks, and three of the packages are tested against faked platform interfaces. This supports the claim that the native side rarely needs custom authoring, with two qualifications listed under "What does not work": a type the rules cannot encode can sink a whole package until a codec override exists (`path_provider` was 0 of 9 before `Directory` got a two-line codec), and without an allow-list the generator also bridges platform-interface classes nobody wants.
4. **Callback interfaces are mostly a dead end, as expected.** Of 25 "subclass me" classes used as widget parameters that have no record alternative, 4 could be implemented in JS over an async bridge. `CustomPainter`, `CustomClipper`, `FlowDelegate`, the layout delegates and `TextInputFormatter` can never work as JS-implemented interfaces.
5. **Objects returned from Dart work with no change to the runtime**, by giving Dart-created objects negative node ids. It does need three small things from core to stop being a trick (listed at the end).

## Part 1 — Survey

`tool/survey_objects.dart`; full output in `objects/out/objects-survey.md`, every member in `objects-survey.json`. Same population as report 02: 544 concrete widgets, 685 constructors, 7,443 parameters.

A parameter type counts as an object when it is a `Listenable`, has a `dispose()`, or is named `*Controller` / `*FocusNode`, and is not a widget, key, `State`, `RenderObject` or `Element`. That gives **40 constructible object classes behind 298 parameter uses** (the same 298 the widget survey counted as handles), plus 66 abstract "subclass me" candidates.

### Member coverage by general rules

| measure | 40 classes used by widgets | all 200 identity classes exported by `package:flutter` |
|---|---:|---:|
| has its own public constructor | 33 (82.5 %) | 142 (71.0 %) |
| has a constructor usable by rule | 31 (77.5 %) | 111 (55.5 %) |
| methods bridgeable (args decodable, result encodable) | 143 of 164 (87.2 %) | 1,008 of 1,250 (80.6 %) |
| methods bridgeable with no other object crossing | 116 of 164 (70.7 %) | 864 of 1,250 (69.1 %) |
| getters mirrorable as a value | 123 of 164 (75.0 %) | 1,082 of 1,476 (73.3 %) |
| getters returning another object | 19 | 196 (13.3 %) |
| setters bridgeable | 30 of 37 (81.1 %) | 287 of 423 (67.8 %) |

For the 40: push channel is `ValueListenable` for 11, plain `Listenable` for 20, none for 9; no class exposes a `Stream`. 29 have `dispose()`. 7 are only constructible through a subclass. Constructor parameters (80): 54 data, 16 unbridgeable, 4 objects, 3 void callbacks, 3 `TickerProvider`. Method results (164): 85 void, 35 `Future<void>` (including `TickerFuture`), 31 sync values, 8 objects, 1 `Future<value>`, 4 unencodable. In the 200-class population 4 classes take a `TickerProvider` and 4 need a `BuildContext` in every constructor.

The rules, beyond the widget generator's record and enum rules:

- **Constructor parameter**: data (decoded); object (resolved from a node reference); `void` callback with encodable args (wired like a widget callback); `TickerProvider` (environmental, supplied by the handle); `BuildContext` (environmental, not supplied: blocks the constructor if required); anything else dropped if optional.
- **Method**: bridgeable when every must-supply argument is data or an object and the result is void, an encodable value, a `Future` of either, a `Stream` of encodable events, or an object. A sync return is fine in this direction. Hidden: private, deprecated, `@protected`, `@visibleForTesting`, `@visibleForOverriding`, `@internal`, `debug*`, operators, generic methods, and the listener/diagnostics plumbing.
- **Getter**: value (encodable, candidate to mirror), object, stream, or unbridgeable. Function-typed fields are not state.
- A class result counts as a record only when its fields come from constructor parameter names or declared fields. The widget generator's last resort ("every public getter") is refused here: it turned `FocusAttachment` and `ScrollMetrics` into nonsense records.

### What is unbridgeable (40 classes)

| member | n | examples |
|---|---:|---|
| getter: collection of objects | 15 | `FocusNode.ancestors/children/descendants`, `ScrollController.positions` |
| ctor param: void callback with unencodable args | 7 | `ScrollController.onAttach/onDetach(ScrollPosition)` |
| ctor param / setter: callback returning a value synchronously | 6 + 5 | `FocusNode.onKeyEvent` (returns `KeyEventResult`), `Animation.transformer` |
| method: needs a framework object | 5 | `createScrollPosition(physics, ScrollContext, old)` |
| method: generic | 5 | `Animation.drive<U>`, `RestorationBucket.read<P>` |
| method: needs `BuildContext` | 3 | `TextEditingController.buildTextSpan`, `MagnifierController.show` |
| method: takes a callback | 3 | `AndroidViewController.addOnPlatformViewCreatedListener` |
| getter / result with no record shape | 6 | `TransformationController.value` (`Matrix4`), `FocusNode.attach` (`FocusAttachment`), `BuildContext`, `RenderObject` |
| ctor param: builder | 1 | `OverlayEntry.builder` |

`FocusNode.onKeyEvent` is the one that hurts: keyboard handling from JS needs a synchronous answer.

### Top 30 by usage

`methods ok` counts methods the rules can bridge when every object type is itself generated.

| # | class | param uses | widgets | push | ctor | methods ok | value getters | object getters | setters ok |
|---:|---|---:|---:|---|---|---:|---:|---:|---:|
| 1 | `FocusNode` | 94 | 62 | listenable | ok | 6/7 | 10/19 | 3 | 4/6 |
| 2 | `ScrollController` | 38 | 24 | listenable | ok | 4/5 | 4/6 | 1 | 0/0 |
| 3 | `Animation` (abstract) | 35 | 27 | valueListenable\<double\> | factory | 0/1 | 6/6 | 0 | 0/0 |
| 4 | `WidgetStatesController` | 30 | 18 | valueListenable\<Set\<WidgetState\>\> | ok | 1/1 | 1/1 | 0 | 1/1 |
| 5 | `TextEditingController` | 12 | 11 | valueListenable\<TextEditingValue\> | ok | 2/3 | 3/3 | 0 | 3/3 |
| 6 | `CustomClipper` (abstract) | 8 | 8 | listenable | via subclass | 3/3 | 0/0 | 0 | 0/0 |
| 7 | `MenuController` | 8 | 8 | none | ok | 3/3 | 1/1 | 0 | 0/0 |
| 8 | `ValueNotifier` | 6 | 6 | valueListenable | ok | 0/0 | 1/1 | 0 | 1/1 |
| 9 | `UndoHistoryController` | 6 | 5 | valueListenable\<UndoHistoryValue\> | ok | 2/2 | 1/3 | 2 | 1/1 |
| 10 | `RouteInformationProvider` (abstract) | 4 | 4 | valueListenable\<RouteInformation\> | via subclass | 1/1 | 1/1 | 0 | 0/0 |
| 11 | `ViewportOffset` (abstract) | 4 | 4 | listenable | factory | 6/6 | 4/4 | 0 | 0/0 |
| 12 | `AnimationController` | 4 | 3 | valueListenable\<double\> | ok + vsync | 11/13 | 13/14 | 1 | 3/3 |
| 13 | `CarouselController` | 4 | 1 | listenable | ok | 5/6 | 6/8 | 1 | 0/0 |
| 14 | `TabController` | 4 | 3 | listenable | ok + vsync | 1/1 | 6/7 | 1 | 2/2 |
| 15 | `ExpansibleController` | 3 | 3 | listenable | ok | 3/3 | 1/1 | 0 | 0/0 |
| 16 | `SliverOverlapAbsorberHandle` | 3 | 3 | listenable | ok | 0/0 | 2/2 | 0 | 0/0 |
| 17 | `PageController` | 3 | 1 | listenable | ok | 8/9 | 8/10 | 1 | 0/0 |
| 18 | `FocusScopeNode` | 2 | 1 | listenable | ok | 9/10 | 13/23 | 4 | 6/8 |
| 19 | `TransformationController` | 2 | 1 | valueListenable\<Matrix4\> | ok | 1/1 | 0/1 | 0 | 1/1 |
| 20 | `CustomPainter` (abstract) | 2 | 1 | listenable | via subclass | 4/4 | 0/0 | 0 | 0/0 |
| 21 | `OverlayPortalController` | 2 | 1 | none | ok | 3/3 | 1/1 | 0 | 0/0 |
| 22 | `Listenable` (abstract) | 2 | 2 | listenable | blocked (`Listenable.merge` takes a collection of objects) | 0/0 | 0/0 | 0 | 0/0 |
| 23 | `PipelineOwner` | 2 | 2 | none | ok | 9/10 | 0/2 | 1 | 0/1 |
| 24 | `SearchController` | 2 | 1 | valueListenable\<TextEditingValue\> | ok | 4/5 | 5/5 | 0 | 3/3 |
| 25 | `TabBarScrollController` | 2 | 1 | listenable | ok | 4/5 | 4/6 | 1 | 0/0 |
| 26 | `FixedExtentScrollController` | 2 | 1 | listenable | ok | 6/7 | 6/8 | 1 | 0/0 |
| 27 | `DraggableScrollableController` | 1 | 1 | listenable | ok | 5/5 | 3/3 | 0 | 0/0 |
| 28 | `HeroController` | 1 | 1 | none | ok | 7/7 | 0/1 | 0 | 0/0 |
| 29 | `OverlayEntry` | 1 | 1 | listenable | blocked (`builder`) | 2/2 | 4/4 | 0 | 2/2 |
| 30 | `AndroidViewController` (abstract) | 1 | 1 | none | via subclass | 8/10 | 5/5 | 0 | 0/1 |

Two readings of this table matter:

- **`FocusNode` and `ScrollController` are 44 % of all object parameter uses; the top five are 70 %.** A curated declaration for a dozen classes covers nearly everything widgets ask for.
- **`Animation<double>` is third (35 uses in 27 widgets) and is abstract.** It is produced by `AnimationController` (generated here, and accepted wherever an `Animation` is expected, see the brand type below), by `CurvedAnimation(parent:, curve:)` (an object constructed from another object, which the constructor rule handles), and by `controller.drive(tween)` / `tween.animate(controller)` (a generic method, and a method on a record returning an object: neither is covered).

"Bridgeable" overstates usefulness for classes that are framework plumbing. `ScrollPosition` has 22 public methods of which 17 are bridgeable by rule, and 13 of those (`applyContentDimensions`, `correctPixels`, `didEndScroll`, `setPixels`...) must never be called by an app. They carry no `@protected`. The rules cannot tell an app-facing method from a framework-facing one; see the declaration file.

### Callback interfaces

The generated table (`objects-survey.md`, last section) classifies each abstract or overridable method by what the Dart-to-JS direction requires: `fire` (void), `async` (returns a `Future`), `sync` (returns a value), `builder` (returns a widget), `opaque` (an argument is a context object such as `Canvas`). It is a mechanical first cut: it marks `shouldRebuild(oldDelegate)` as opaque although a generated proxy could answer it on the Dart side with a version counter. Counts: of 66 candidates, 41 have a record alternative (their built-in subclasses are plain values: `EdgeInsetsGeometry`, `ShapeBorder`, `ScrollPhysics`, `SliverGridDelegate`, `TextInputFormatter`) and only user subclasses are lost. Of the 25 with no record alternative: **4 async-ok, 6 sync-return, 2 builder, 13 never**.

Judged by hand for the classes that matter:

| class | what the framework calls | over an async bridge |
|---|---|---|
| `CustomPainter` | `paint(Canvas, Size)` during paint; `shouldRepaint`; `hitTest` | **Never.** `Canvas` is a synchronous imperative API called many times per frame. The workable shape is a different one: JS sends a display list as a record and a fixed Dart painter replays it. That is a new record type, not a callback interface. |
| `CustomClipper<T>` | `getClip(Size)` during layout/paint | **Never** as a callback. The size is only known in Dart. Declarative shapes (`ShapeBorderClipper` with a `ShapeBorder` record) cover the common cases. |
| `FlowDelegate`, `MultiChildLayoutDelegate`, `SingleChildLayoutDelegate` | layout-time callbacks that must call `layoutChild` / return constraints synchronously | **Never.** |
| `SliverPersistentHeaderDelegate` | `build(context, shrinkOffset, overlapsContent)`, `minExtent`, `maxExtent`, `shouldRebuild` | Not as an interface. `minExtent` / `maxExtent` become data; `build` becomes the existing "eager child plus pushed signal with one frame of lag" pattern, chosen by hand. |
| `SliverChildDelegate`, `ListWheelChildDelegate` | `build(context, index)` | Not as an interface. Existing eager-children, lazy-inflation pattern. |
| `TextInputFormatter` | `formatEditUpdate(old, new)` returns the new value synchronously, inside the text input pipeline | **Never** for user logic. The built-in formatters are records (needs a `Pattern` codec, not present). Async correction through the controller flickers. |
| `ScrollBehavior` | ten overridable sync methods | Not as an interface; `ScrollBehavior().copyWith(scrollbars:, dragDevices:, physics:, overscroll:)` as a record covers typical use. |
| `WidgetStateProperty<T>` | `resolve(states)` sync | Not as an interface; state-to-value map record (report 02). |
| `RouterDelegate`, `SearchDelegate`, `TextSelectionControls` | builders | **Never** as is. |
| `RouteInformationParser` | two `Future` methods, one sync | Partly (the sync `restoreRouteInformation` needs a default). |
| `NavigatorObserver`, `RouteInformationProvider`, `AutofillClient` and listener-style interfaces whose methods are all `void` | notifications | **Works**: fire-and-forget, with arguments such as `Route` reduced to a record (`settings.name`, `settings.arguments`). |

So the only callback interfaces worth generating are the listener-shaped ones (every method `void` or `Future`, arguments encodable). This spike does not emit an interface proxy; it wires `void` constructor callbacks the same way widget callbacks are wired, and reports `Future`-returning ones as needing `_functionCallAsync` (on `slivers`). Everything else needs a synchronous call into JS or a hand-chosen pattern, and no amount of generation changes that.

## Part 2 — The generated shape

### Dart (excerpt of `lib/generated/controllers.g.dart`, unedited apart from line wrapping)

```dart
/// GENERATED handle for [ScrollController].
///
/// Not bridged: ctor `onAttach` (not exposed to JS (callback void(unencodable args)); wired to a state refresh),
/// ctor `onDetach` (...), `attach()` (excluded by declaration), `createScrollPosition()` (...),
/// `detach()` (excluded by declaration), `positions` (Iterable<ScrollPosition> (not encodable)).
class GenScrollControllerHandle extends FuseObjectHandle<ScrollController> {
  GenScrollControllerHandle(super.node) {
    final p = node.props;
    object = ScrollController(
        initialScrollOffset: decDouble(p['initialScrollOffset']) ?? 0.0,
        keepScrollOffset: decBool(p['keepScrollOffset']) ?? true,
        debugLabel: decString(p['debugLabel']),
        onAttach: (_a0) => refreshSoon(), onDetach: (_a0) => refreshSoon());
    _init();
  }

  /// Wraps an object created on the Dart side (returned from a method or getter).
  GenScrollControllerHandle.wrap(super.node, this.object)
      : super(borrowed: node.props[r'$borrowed'] == true) { _init(); }

  @override
  late final ScrollController object;

  Object? _sOffset = _unset;
  Object? _sHasClients = _unset;

  void _init() {
    object.addListener(refresh);
    scheduleInitialPush(refresh);
  }

  @override
  void refresh() => pushState(_collect());

  /// Reads the mirrored getters and returns the ones that changed since the last push.
  Map<String, Object?> _collect() {
    final patch = <String, Object?>{};
    final o = object;
    if (o.positions.length == 1) { final v = o.offset; if (v != _sOffset) { _sOffset = v; patch['offset'] = fuseNum(v); } }
    try { final v = o.hasClients; if (v != _sHasClients) { _sHasClients = v; patch['hasClients'] = v; } } catch (_) {}
    return patch;
  }

  @override
  Future<dynamic> call(String method, dynamic value) => fuseGuard(() async {
        final a = fuseArgs(value);
        try {
          switch (method) {
            case 'animateTo':
              await fuseAwait(object.animateTo(
                  fuseReq(decDouble(a['offset']), 'ScrollController.animateTo', 'offset'),
                  duration: fuseReq(decDuration(a['duration']), 'ScrollController.animateTo', 'duration'),
                  curve: fuseReq(decCurve(a['curve']), 'ScrollController.animateTo', 'curve')));
              return null;
            case 'jumpTo':
              object.jumpTo(fuseReq(decDouble(a['value']), 'ScrollController.jumpTo', 'value'));
              return null;
            case r'$get':
              switch (a['name']) {
                case 'hasClients': return object.hasClients;
                case 'offset': final r = object.offset; return fuseNum(r);
                // initialScrollOffset, keepScrollOffset ...
                case 'position': return adopt(object.position, 'gen_ScrollPosition');
              }
          }
          return fuseUnknown('ScrollController', a['name'] == null ? method : '$method ${a['name']}');
        } finally {
          if (!isDisposed) refresh();   // state may change without a notification
        }
      });

  @override
  void disposeObject() {
    object.removeListener(refresh);
    object.dispose();
  }
}
```

`TabController` and `AnimationController` differ in one line: `extends FuseObjectHandle<T> with FuseTickerProvider<T>` and `vsync: this`. Classes with several constructors get `object = switch (p[r'$ctor']) { 'fromValue' => ..., _ => ... }`. Setters are a `$set` switch, streams a `$listen` switch.

### TS (excerpt of `ts/generated/controllers.ts`, JSDoc removed)

```ts
export interface ScrollControllerState {      // readable on demand
  hasClients: boolean; initialScrollOffset: number; keepScrollOffset: boolean; offset: number;
}
export type ScrollController = Handle<"gen_ScrollController"> & FuseObject<"ScrollController" | "ChangeNotifier" | "Listenable"> & {
  readonly offset: () => number;           // mirrored signal
  readonly hasClients: () => boolean;      // mirrored signal
  animateTo(offset: number, opts: { duration: Duration; curve: Curve }): Promise<void>;
  jumpTo(value: number): Promise<void>;
  position(): Promise<ScrollPosition>;     // borrowed object
  get<K extends keyof ScrollControllerState>(name: K): Promise<ScrollControllerState[K]>;
  dispose(): void;
};

function bindScrollController(o: ObjectRuntime<"gen_ScrollController">, seed: { offset?: number; hasClients?: boolean }): ScrollController {
  const [offset, setOffset] = createSignal<number>(seed.offset ?? 0);
  const [hasClients, setHasClients] = createSignal<boolean>(seed.hasClients ?? false);
  o.mirror({ offset: setOffset, hasClients: setHasClients });
  return {
    node: o.node, offset, hasClients,
    animateTo: (offset, opts) => o.invoke("animateTo", { offset, ...opts }, 0),
    jumpTo: (value) => o.invoke("jumpTo", { value }),
    position: () => o.get("position").then((r) => (r == null ? null : adoptScrollPosition(r))) as Promise<ScrollPosition>,
    get: o.get, dispose: o.dispose,
  };
}

export interface ScrollControllerOptions { initialScrollOffset?: number; keepScrollOffset?: boolean; debugLabel?: string | null; }

export function createScrollController(opts: ScrollControllerOptions = {}): ScrollController {
  return bindScrollController(createObject("gen_ScrollController", { ...opts }), { offset: opts?.initialScrollOffset ?? 0 });
}
export function adoptScrollController(ref: ObjectRef): ScrollController {
  return bindScrollController(adoptObject("gen_ScrollController", ref), ref.state ?? {});
}
```

A pub.dev controller, unassisted (`mobile_scanner`):

```ts
export type MobileScannerController = Handle<"mobile_scanner_MobileScannerController"> & FuseObject<...> & {
  readonly value: () => MobileScannerStateOut | undefined;        // ValueNotifier: mirrored by rule
  start(opts?: { cameraDirection?: CameraFacing | null; cameraLensType?: CameraLensType | null }): Promise<void>;
  setZoomScale(zoomScale: number): Promise<void>;
  analyzeImage(path: string, opts?: { formats?: BarcodeFormat[] }): Promise<BarcodeCaptureOut | null>;
  barcodes: FuseStream<BarcodeCaptureOut>;                        // Stream -> subscription
  // ...
};
```

### Decisions

| question | decision | why |
|---|---|---|
| Which getters are mirrored | `ValueListenable<T>`: `value`, by rule, no declaration. Plain `Listenable`: none unless declared. | A `ChangeNotifier` says "something changed", not what. Mirroring everything by default would push `AnimationController.value` over the bridge every frame and read getters that assert (`offset`, `page`). |
| De-duplication | Generated. Last pushed value per getter; primitives and classes compared with `==`, collections by encoded deep equality (a `Set` mutated in place is the same instance). | Collapses `TabController`'s two notifications per change into one push with no bespoke `_lastIndex`. Tested. |
| Guards | Optional Dart expression per mirrored getter. Without one, the read is wrapped in `try/catch`: a getter that throws is "not readable now". | The general rule needs no declaration and is correct; the guard only avoids throwing on every notification in the awkward state (one controller on two scroll views). |
| Push format | One `$state` callback per object, carrying a patch of changed fields. | One bridge message per notification however many fields changed; one JS handler per object. |
| Initial values | JS seeds primitive signals from a constructor option of the same name or `initial<Name>`, or one named in the declaration; Dart pushes the real snapshot in a microtask after the create batch. Non-primitive mirrors are `T \| undefined` until that push. | Function props arrive as `setProp` ops after `create`, so a push from the constructor is lost. Verified in the bun test (op order) and the Flutter tests. |
| State that changes with no notification | After every RPC the handle re-reads its mirrors. Void constructor callbacks JS cannot receive (`onAttach(ScrollPosition)`) are wired to a refresh now and after the frame. | Found by the tests: attaching a position does not notify the controller, so `hasClients` and `page` were stale. `AnimationController.stop()` changes `isAnimating` silently. |
| Methods | Deny-list by rule, plus `exclude` (or an allow-list `methods`) in the declaration. | Right for app-facing controllers with zero entries (`TextEditingController`, `AnimationController`, `TabController`, `VideoPlayerController`, `MobileScannerController`); wrong for framework-facing ones (`ScrollPosition`). |
| Argument packing | One map keyed by the Dart parameter name, positional ones too. TS keeps positional parameters positional and puts named ones in a trailing `opts`. | Same convention as records. `TabController.animateTo`'s positional is called `value` in Flutter, so it is `value` here. |
| Non-mirrored getters and setters | One generic `get(name)` / `set(name, value)` pair typed by generated `State` / `Writable` interfaces. Renamed `getProperty` / `setProperty` when the class has its own (`SharedPreferences.get`). | Full coverage without a method per property. |
| `Future`-returning methods | Awaited in Dart; TS passes `timeout: 0`. `TickerFuture` is awaited as `orCancel`. | A scroll or route animation has no natural 30 s bound. A cancelled ticker would otherwise leave the JS promise pending forever; now it rejects with `type: "TickerCanceled"`. Tested. |
| Subtyping in TS | Brand listing the class and all supertypes: `FuseObject<"AnimationController" \| "Animation" \| "Listenable" \| ...>`. | An `AnimationController` is accepted where an `Animation` is expected and a `ScrollController` is not, structurally, with no runtime cost. Checked with `@ts-expect-error`. |

### The declaration file

`objects/fuse.objects.json`, complete, for all eight classes:

```json
{
  "name": "controllers",
  "libs": { "package:video_player/video_player.dart": "video_player" },
  "objects": {
    "ScrollController": {
      "mirror": {
        "offset": { "guard": "o.positions.length == 1", "seed": "initialScrollOffset" },
        "hasClients": {}
      },
      "exclude": ["attach", "detach"]
    },
    "ScrollPosition": {
      "wrapOnly": true,
      "mirror": ["pixels", "maxScrollExtent"],
      "methods": ["animateTo", "jumpTo", "moveTo", "pointerScroll"]
    },
    "FocusNode": { "mirror": ["hasFocus", "hasPrimaryFocus"], "exclude": ["attach", "consumeKeyboardToken"] },
    "TextEditingController": {},
    "PageController": {
      "mirror": { "page": { "guard": "o.positions.length == 1 && o.position.hasContentDimensions" } },
      "exclude": ["attach", "detach"]
    },
    "AnimationController": { "mirror": ["status", "isAnimating"] },
    "TabController": { "mirror": ["index", "indexIsChanging"] },
    "VideoPlayerController": {}
  }
}
```

In the product this is the `overrides` block of `fuse.config.ts` (report 04), keyed by class. How small it can be:

- **Nothing** for a `ValueNotifier`-style controller (`TextEditingController`, `VideoPlayerController`, `MobileScannerController`) and for any class with no reactive state (`SharedPreferences`).
- **One line** for a plain `ChangeNotifier`: the mirror list. `TabController` and `FocusNode` need no guard and no seed (the seed `initialIndex` is found by name).
- **Guards are optional** (the `try/catch` rule is correct without them). `seed` is needed only when no constructor option is named like the getter (`offset` from `initialScrollOffset`).
- **`exclude` / `methods`** only where the class exposes framework plumbing. `attach` / `detach` on `ScrollController` only became bridgeable because `ScrollPosition` was added to the object set; before that they dropped out by rule.
- `wrapOnly` marks a class JS never constructs.

The guard is a Dart expression in a config file. It is the one place where the declaration is code; I found no way around it for `page`.

### Environmental dependencies

- **`TickerProvider`**: recognised by type. The generated handle mixes in `FuseTickerProvider` (support library) and passes `vsync: this`; tickers are tracked and released with the handle. No declaration. This is what the hand-written `FuseTabController` does, made general. The object is constructed in the constructor body because `this` is not available in an initializer list.
- **`TickerMode`** is what a handle outside the tree loses (animations keep ticking on an offstage route). `FuseTickerModeScope(handle:, child:)` is a 12-line generic widget that feeds the subtree's `TickerMode` to the handle's tickers. Tested: with `TickerMode(enabled: false)` the controller's value does not advance.
- **`BuildContext`**: a required context in a constructor blocks it (4 of 200 classes); a context in a method blocks the method (3 in the 40). I did not build the fully widget-scoped variant (a generated `State with TickerProviderStateMixin` that creates the object in `initState` and registers it as the node's handle). It would be needed for those 4 classes and for controllers that need `Theme` or `MediaQuery` at construction. It changes the lifetime rule (the object exists only while the widget is mounted, so RPCs before mount must queue or fail) and should be a separate, explicit kind rather than a silent fallback.

### Typed errors

The bridge turns a thrown Dart error into `JsError.runtime('$e\n$st')`: one string. Generated code therefore never throws across the bridge. `fuseGuard` catches and returns `{$err: {type, message, code?, details?, stack?}}`; the TS runtime rethrows it as `FuseError` with those fields. Success returns the bare value, so the happy path costs nothing.

- `type` is the Dart class name: `PlatformException` (with `code`, `message`, `details`), `ArgumentError` / `RangeError` (with the parameter name as `code`), `TickerCanceled`, `UnknownMember`, `BadObjectRef`, `AssertionError`, or a package's own exception class.
- Dart has no checked exceptions, so per-method error types cannot be derived. The module generator emits the closest thing: a union of the exception classes the package exports (`GeolocatorErrorType = "PermissionDeniedException" | "LocationServiceDisabledException" | ...`).
- Decode failures are typed too: a missing required argument and an invalid enum or constant both arrive as `ArgumentError` naming the member and parameter.
- Not unified: errors raised by the runtime itself (`HandleDisposedError`, missing handle) still cross as strings.

## Part 3 — What ran

| check | result |
|---|---|
| `flutter analyze` on the package (generated Dart for 8 controllers and 6 packages: 3,713 lines; support; tools; tests) | No issues |
| `tsc --strict` on generated TS (3,255 lines), `fuse-objects.ts`, `sample.ts`, `sample-modules.ts`, with `solid-fuse/*` mapped to `packages/solid-fuse/src/*` | No errors; 19 `@ts-expect-error` negative cases hold |
| `flutter test` | 22 passed (15 objects, 7 modules) |
| `bun test` (generated TS + runtime + the real `handle.ts` / `renderer.ts` / `channels.ts`, only `fjs.bridge_call` faked) | 6 passed, 34 assertions |

What the Flutter tests assert, against the real classes:

- `ScrollController`: constructor options decoded with Flutter's defaults; `jumpTo` and `animateTo` move a real `ListView`; the `animateTo` call resolves only when the animation ends; `offset` and `hasClients` pushes; no push for a notification that changes nothing; one controller on two scroll views does not throw; typed errors for a missing argument, unknown member, bad curve and a Flutter assertion; the `dispose` op disposes the controller and cancels the pending initial push.
- `ScrollPosition` returned by `position`: negative id, state snapshot in the reference, same node on a second request, RPC on the adopted node moves the real position, JS-side dispose leaves the borrowed position alive, disposing the parent removes the child node.
- `FocusNode`: `requestFocus` / `unfocus` on a real `TextField`; `hasFocus` pushes; setter; object argument resolved from a node reference; sync callback setter rejected.
- `TextEditingController`: `text` / `selection` setters; record-valued `value` push including on user typing; `fromValue` named constructor.
- `PageController`: `jumpToPage`, `previousPage`; `page` guarded until laid out.
- `AnimationController`: built with no `State`; usable as `FadeTransition.opacity`; `forward` resolves on completion; exactly the status transitions are pushed and never the per-frame value; `stop()` is reflected; dispose mid-animation rejects the pending call with `TickerCanceled`; tickers follow `TickerMode` through the scope widget.
- `TabController`: one `index` push per change; setter jumps; a tap on the real `TabBar` reaches JS.
- `VideoPlayerController` (platform interface faked): `networkUrl` named constructor with a `Uri` from a string and a nested options record; `initialize`, `setVolume`, `seekTo`, `play` reach the platform; `VideoPlayerValue` pushed as a record (`duration` in ms, `size`, `isPlaying`); `Future<Duration?>` getter read on demand.

`MobileScannerController` is generated, analyzed and typechecked, not exercised.

### Generated versus hand-written

Sizes: hand-written Dart 40 / 30 / 66 lines (scroll, focus, tab) and TS 28 / 21 / 46; generated Dart 85 / 120 / 94 and TS 104 / 161 / 90 (TS includes JSDoc copied from Flutter). Hand-written once and shared: 283 lines of Dart support, 226 of TS runtime.

`FuseScrollController` (`dart/lib/src/handles/scroll_controller.dart`) line by line:

| hand-written | generated | |
|---|---|---|
| `ScrollController(initialScrollOffset: ...)` | all three data options, with Flutter's defaults regenerated; `onAttach` / `onDetach` wired to a refresh | gain |
| `addListener(() => callback('setScrollOffset')?.call(object.offset))` | guarded, de-duplicated patch of `offset` and `hasClients` | gain: the hand-written line asserts when the controller has zero or two positions, and sends every notification |
| `animateTo`: `duration` defaults to 300 ms, `curve` hard-coded to `easeInOut`, future not returned | Flutter's signature: `duration` and `curve` required, any curve, awaited | gain in fidelity and completion; **loss** of the convenient default: `scroll.animateTo(0, { duration: 300 })` no longer typechecks |
| `jumpTo((value as num).toDouble())` | `{value}` map, `fuseReq` with a named error | neutral |
| `throw StateError('Unknown ...')` | typed `UnknownMember` envelope | gain |
| `dispose() => object.dispose()` | also removes the listener, cancels streams, removes adopted children | gain |
| nothing | `get(...)` for four getters; `position()` | gain |

`src/scroll-controller.ts`: `scrollOffset` becomes `offset` (the 1:1 name; a breaking rename); `animateTo` / `jumpTo` are typed `void` today but return promises, generated ones say `Promise<void>`; the seed from `initialScrollOffset` is the same.

`FuseFocusNode`: `focus()` becomes `requestFocus()`; `unfocus` gains `disposition`; constructor options, `hasPrimaryFocus`, `nextFocus`, `previousFocus`, `focusInDirection`, four setters and ten readable getters appear. `onKeyEvent` is as impossible as before.

`FuseTabController`: the invented `jumpTo` becomes `set("index", n)`, which is what it did; `animateTo` gains `curve` and Flutter's default duration; the bare-`Ticker` provider and the `_lastIndex` de-dup become shared code. **Loss**: `length` was a synchronous property copied from the options; generated it is `await tabs.get("length")`.

What the generated version loses in general:

- **Curated names and defaults.** The generated API is Flutter's, parameter names included.
- **Synchronous constants.** Nothing is readable synchronously unless mirrored.
- **Size.** Two to three times the lines per handle, and every bridgeable member is compiled in whether used or not. Adapters need an allow-list for the same reason widgets do.
- **Per-push cost.** A patch map instead of a bare value. Not measured.
- **Judgement.** It exposed 13 `ScrollPosition` methods no app should call until told otherwise.

What it gains: completeness, fidelity, completion promises, typed errors, guarded and de-duplicated state, object graphs, and no per-class Dart or TS.

## Part 4 — Non-UI plugin APIs

`tool/gen_module.dart --name <n> --lib <uri>=<prefix>` takes a library's export namespace and emits one Dart channel handler (`mod:<name>`, through the existing `channels.on` / `channels.call`) and one TS module:

- top-level functions become exported async functions;
- static methods and static getters become members of a `const ClassName = { ... }`;
- an exported class is a record if it has a record shape, otherwise an object emitted with the same object emitter as the controllers. A class that is neither a record nor structurally an object but has behaviour falls back to "opaque object", flutter_rust_bridge's rule (`SharedPreferences`: private constructor, no fields);
- a function returning an object adopts it as a handle node; a `Stream` becomes a subscription (`$listen` / `$cancel` with a JS-allocated id, events on `mod:<name>:event`);
- records and enums by the widget generator's rules, plus four codec overrides added here: `Uri` and `DateTime` as strings, `File` and `Directory` as paths.

```ts
export function launchUrl(url: Uri, opts?: { mode?: LaunchMode; webViewConfiguration?: WebViewConfiguration;
    browserConfiguration?: BrowserConfiguration; webOnlyWindowName?: string | null }): Promise<boolean> {
  return m.invoke("launchUrl", { url, ...opts }, 0);
}
export const SharedPreferences = {
  getInstance: (): Promise<SharedPreferences> => m.invoke("SharedPreferences.getInstance", {}, 0).then(adopt...),
};
export type SharedPreferences = Handle<"shared_preferences_SharedPreferences"> & FuseObject<"SharedPreferences"> & {
  getString(key: string): Promise<string | null>;
  setStringList(key: string, value: string[]): Promise<boolean>;
  // 14 more
};
export const Geolocator = {
  getCurrentPosition: (opts?: { locationSettings?: LocationSettings | null }): Promise<PositionOut> => ...,
  getPositionStream: (opts?: { locationSettings?: LocationSettings | null }): FuseStream<PositionOut> => ...,
};
```

### Coverage

"Callable surface" is every public, non-deprecated top-level function, static method and getter, and every constructor, method, getter, setter and stream of the classes classified as objects. Records and enums are not counted here; they are covered by the data rules. No per-package configuration was written.

| package | callable surface | bridged | what is not | generated Dart / TS lines |
|---|---:|---:|---|---|
| url_launcher 6.3 (`url_launcher.dart`, `url_launcher_string.dart`) | 7 | 7 | — | 78 / 79 |
| shared_preferences 2.5 (legacy, `Async`, `WithCache`) | 51 | 51 | — | 330 / 313 |
| path_provider 2.1 | 9 | 9 | — (0 of 9 before the `Directory` codec) | 62 / 80 |
| share_plus 13 | 10 | 6 | constructors and a getter of `SharePlusLinuxPlugin` / `SharePlusWindowsPlugin`, which take a `UrlLauncherPlatform` and are not app API. The real API, `SharePlus.instance.share(ShareParams)` with `XFile` records, is complete. | 279 / 159 |
| geolocator 14 | 29 | 29 | — | 437 / 295 |
| mobile_scanner 7.5 | 79 | 74 | `buildCameraView()` (returns a `Widget`, twice), `ScanWindowUtils.calculateBoxFitRatio` (returns a Dart record type), `BarcodePainter` (takes a `TextPainter`) | 1,026 / 847 |
| **total** | **185** | **176 (95.1 %)** | | |

All six analyze and typecheck. Tested against faked platform interfaces: `url_launcher` (arguments including a `Uri`, an enum and a nested record with a map; defaults; `PlatformException` with its `code` and `details`), `shared_preferences` (the singleton handed out as an object, its methods reading and writing the real store, identity preserved across calls), `geolocator` (`Future<record>`, `Future<enum>`, a pure static helper, a `Stream` delivered and cancelled).

What the number hides:

- **The denominator contains API nobody wants.** `GeolocatorPlatform` (11 methods, 2 streams), `MobileScannerPlatform`, `ScanWindowPainter`, `BarcodePainter`, `Position.fromMap` are public and bridged. Without them geolocator's surface is 16, all bridged. An allow-list is required for binary size and for a readable API, as report 04 says for widgets.
- **One unencodable type can zero a package.** `path_provider` returns `Directory` from every function. Before the override the result was 0 of 9. Any `dart:io`, `dart:typed_data` or SDK type a plugin returns needs a codec in the shared registry. `Uint8List` currently crosses as a JSON array of numbers, which is unusable for images or files of any size.
- **Round trips.** Every call on an instance is one bridge call. `SharedPreferences.getString` is synchronous in Dart and asynchronous here. Builder-style APIs (`firestore.collection(...).where(...).orderBy(...)`) would cost one round trip and one adopted node per link.
- **Not attempted**: `in_app_purchase` and `firebase_*` (the brief's other examples). I expect `in_app_purchase` to work (a singleton, a `Stream<List<PurchaseDetails>>`, records). I expect `cloud_firestore` to generate but be unpleasant: generic `withConverter<T>` functions drop out, chains are chatty, and snapshot objects with lazy fields have no record shape.
- **Generic functions and Dart record types** are not bridged (1 case here).
- **Plugin registration and platform setup** (permissions, `Info.plist`, Gradle) are outside what an analyzer can derive.

## Part 5 — Lifetimes and ownership

| object | who owns it | when it is disposed | status |
|---|---|---|---|
| Created from JS (`createX(...)`) | The reactive owner it was created under, as today (`createHandle` plus `onCleanup`); the caller if there is no owner. | Owner cleanup or `dispose()` sends the `dispose` op; the runtime removes the node; the handle removes listeners, cancels streams, removes adopted children, then calls `object.dispose()`. | Built, tested on both sides. |
| Returned by a getter (`scroll.position()`) | The parent object. **Borrowed.** | Never by JS. `dispose()` on the JS wrapper only drops the node. The node is removed with its parent as a backstop. | Built, tested. |
| Returned by a method on an object | JS, **owned** when the class has `dispose()`. | `dispose()` from JS; otherwise when the parent handle is disposed (backstop). | Built, not tested (no method in the generated set returns a generated object). |
| Returned by a module function (`SharedPreferences.getInstance()`, a factory) | Owned if the class has `dispose()` and it came from a method; borrowed if it came from a static getter (`SharePlus.instance`). | `dispose()` from JS or cleanup of the owner it was adopted under. **No backstop**: a module has no parent node. | Built; identity and release tested. |
| Created by Dart and passed to JS in a callback (`onAttach(ScrollPosition)`) | Dart. Borrowed for the duration the framework keeps it. | By Dart; the node should be dropped when the callback's owner goes away. | Not built. The argument encoder has no object case; today such callbacks are only used as refresh signals. |

How a Dart-created object becomes a handle: `fuseAdopt` allocates a **negative** node id (JS allocates from 0 up), creates the node in the registry, attaches a handle built by the generated `.wrap(node, object)` constructor, and returns `{_node, type, state}`. `state` is the current mirrored snapshot, so the JS signals start correct. On the JS side `adoptObject` builds a `FuseNode` with that id and registers its `$state` / `$event` handlers with ordinary `setProp` ops. From then on it is an ordinary handle: `_handleCall` reaches it and it can be passed as a widget prop. No runtime change was needed; this is tested on the Dart side and executed on the JS side.

Identity is preserved (an `Expando` from object to node): asking twice returns the same node, as Pigeon's `ProxyApi` instance manager does. UniFFI does not do this (each crossing mints a new foreign wrapper around the same `Arc`), and flutter_rust_bridge's opaque types are `Arc` handles with the same property. For UI objects identity matters: comparing two `FocusNode` references in JS should work.

Precedents and what was taken from each:

- **UniFFI**: explicit destroy, no guard against use after free. Taken: explicit `dispose()`. Added: a call on a disposed node is rejected by the runtime (`HandleDisposedError`), and owner-scoped cleanup makes explicit calls rare.
- **flutter_rust_bridge**: opaque by default when a type cannot be a record, `Arc` reference counting. Taken: the opaque fallback (`SharedPreferences`). Not taken: reference counting; the node is the single reference.
- **Pigeon `ProxyApi`**: weak references and finalizers. Not taken. QuickJS has `FinalizationRegistry`, but tying a Dart `AnimationController` to JS garbage collection is the jnigen failure mode (report 03). The reactive owner is the lifetime.

Open problems:

- **Owner loss across `await`.** `await scroll.position()` resumes outside the reactive owner, so the adopted wrapper is not registered for cleanup. Borrowed objects are saved by the parent backstop; owned objects from a module are not. A returned-object API should accept an owner explicitly or be called through a helper that captures it.
- **Double ownership.** A borrowed object that Flutter disposes (a `ScrollPosition` when its `Scrollable` unmounts) leaves a live node wrapping a dead object. Calls then fail with a typed assertion, not a clean "gone". The handle should listen for disposal where the class offers it, and there is no general hook.
- **Owned versus borrowed is inferred** (has `dispose()` and came from a method). It will be wrong for some APIs and belongs in the declaration.

## What does not work

1. **Synchronous Dart-to-JS calls**, again. `FocusNode.onKeyEvent`, `TextInputFormatter`, `CustomPainter`, every layout delegate and builder. 21 of the 25 "subclass me" classes without a record alternative.
2. **Not run end to end.** The Dart half is tested with a fake JS side, the JS half with a fake `fjs`. Nothing ran through QuickJS in an app. The initial-push microtask ordering, in particular, is argued from `applyOps` being synchronous per batch, and tested on each side separately.
3. **The rules cannot tell app API from framework API.** `ScrollPosition` and the platform-interface classes show it. The honest default is an allow-list per package with the generator's survey as the menu.
4. **Mirroring is push-always.** A declared mirror is pushed whether or not JS reads it. Per-frame values are simply not mirrored (`AnimationController.value` is read on demand), which means animations cannot be observed from JS at all. Solid 2.0's `unobserved` callback would allow subscribe-on-read; not built.
5. **Guards are Dart source in a config file**, unchecked until the generated file is analyzed.
6. **`refreshSoon` is a heuristic.** State that becomes readable at layout time with no notification and no callback is still stale until the next RPC or notification.
7. **No timeout on `Future`-returning calls.** A Dart future that never completes leaves a JS promise pending. Only `TickerFuture` is handled.
8. **Binary data.** `Uint8List` crosses as a number array.
9. **Records in the Dart-to-JS direction are approximations.** Fields are getters named like constructor parameters; a class without such getters has no shape (`Matrix4`, so `TransformationController.value` cannot be mirrored without a codec).
10. **Methods taking callbacks** (`addStatusListener`-style subscriptions outside `Listenable`) are dropped; the wire has no per-call callback ids.
11. **Callback-interface proxies are not generated**, not even for the listener-shaped ones that would work.
12. **Unknown generics**: classes are instantiated to bounds (`ValueNotifier<dynamic>`), generic methods are dropped.
13. **Naming collisions** between a mirrored getter and a method are only warned about.
14. **Widget-scoped objects** for `BuildContext`-dependent constructors are designed above, not built.
15. **Cost is unmeasured**: binary size of registering every member, and the per-call and per-push overhead of maps over bare values.

## What core would need

All of this ran without editing `packages/solid-fuse`. To make it supported rather than incidental:

1. **A public way for a package to reach channels.** `FuseRuntime` exposes `registry` but not its `FuseChannels`, so a generated module cannot register `mod:<name>` today; the spike abstracts it behind `FuseBridge` and tests with a fake. `runtime.registerModule(name, handler)` or a `channels` getter fixes it.
2. **A reserved id space for Dart-created nodes**, and `createHandle` accepting an existing id, instead of negative ids and assigning `node.id` after construction.
3. **Structured errors in the bridge.** Carry `{type, code, message, details}` through `JsResult.err` so that runtime errors and generated errors are the same `FuseError`, and the `$err` envelope can go.
4. **A post-batch hook on handles** (`attached()` after the create batch is applied), replacing the microtask for the initial push.
5. **`_functionCallAsync`** from `slivers`, for `Future`-returning callbacks.
6. **Decide the naming break**: generated factories use Flutter's names (`offset`, `requestFocus`) and node types with a prefix. The hand-written `createScrollController` / `createFocusNode` either stay as curated wrappers over the generated ones or are replaced.

## How to run

```bash
cd experiments/interop/objects
./run.sh
```

Commands, layout and wire conventions are in `objects/README.md`. Outputs: `objects/out/objects-survey.md` (all tables), `objects/out/*.report.json` (per-run coverage, every dropped member with its reason), `objects/lib/generated/`, `objects/ts/generated/`.
