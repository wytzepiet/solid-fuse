# Survey

- widgets (public, concrete, Widget subclasses): 544  (by lib: widgets 297, material 189, cupertino 58)
- deprecated widget classes: 3, generic widget classes: 36, without public ctor: 4
- public non-deprecated constructors: 685 (generative 675 with params, factory 10 with params)
- constructor parameters: 7443 (generative only: 7322; primary ctor only: 5434)
- required: 885, must-supply (required non-null): 772, positional: 16, with default: 1715, deprecated params: 97
- distinct parameter types: 598

## Parameters by family (all public ctors)

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| primitive | 2016 | 27.1% | 100.0% |
| data | 1949 | 26.2% | 100.0% |
| callback | 750 | 10.1% | 78.5% |
| widget | 715 | 9.6% | 98.2% |
| enum | 698 | 9.4% | 100.0% |
| key | 687 | 9.2% | 99.0% |
| handle | 298 | 4.0% | 100.0% |
| builder | 147 | 2.0% | 0.0% |
| unbridgeable | 119 | 1.6% | 0.0% |
| generic | 34 | 0.5% | 100.0% |
| dynamic | 30 | 0.4% | 100.0% |

## Parameters by family/sub-class (all public ctors)

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data/union | 1198 | 16.1% | 100.0% |
| primitive/bool | 992 | 13.3% | 100.0% |
| enum/enum | 695 | 9.3% | 100.0% |
| key/key | 680 | 9.1% | 100.0% |
| data/ctor | 643 | 8.6% | 100.0% |
| primitive/double | 615 | 8.3% | 100.0% |
| widget/child | 356 | 4.8% | 100.0% |
| callback/void(encodable args) | 343 | 4.6% | 100.0% |
| primitive/String | 260 | 3.5% | 100.0% |
| widget/slot | 258 | 3.5% | 100.0% |
| callback/void() | 246 | 3.3% | 100.0% |
| primitive/int | 134 | 1.8% | 100.0% |
| handle/controller | 130 | 1.7% | 100.0% |
| callback/sync-return | 125 | 1.7% | 0.0% |
| handle/focus | 95 | 1.3% | 100.0% |
| builder/unencodable args | 84 | 1.1% | 0.0% |
| data/enumlike-only | 70 | 0.9% | 100.0% |
| widget/children | 48 | 0.6% | 100.0% |
| builder/encodable args | 39 | 0.5% | 0.0% |
| handle/animation | 38 | 0.5% | 100.0% |
| handle/listenable | 33 | 0.4% | 100.0% |
| widget/slot-list | 32 | 0.4% | 100.0% |
| generic/type-parameter | 31 | 0.4% | 100.0% |
| dynamic/Object | 26 | 0.3% | 100.0% |
| unbridgeable/map-key | 20 | 0.3% | 0.0% |
| callback/void(unencodable args) | 20 | 0.3% | 0.0% |
| builder/context-only | 20 | 0.3% | 0.0% |
| unbridgeable/abstract-no-impl | 18 | 0.2% | 0.0% |
| unbridgeable/needs-nested-widget/callback | 16 | 0.2% | 0.0% |
| data/union [list] | 16 | 0.2% | 100.0% |
| unbridgeable/no-usable-constructor | 16 | 0.2% | 0.0% |
| data/ctor [list] | 15 | 0.2% | 100.0% |
| unbridgeable/framework-object | 15 | 0.2% | 0.0% |
| widget/subtype | 13 | 0.2% | 0.0% |
| unbridgeable/needs-nested-widget/callback [list] | 9 | 0.1% | 0.0% |
| callback/Future<void> | 9 | 0.1% | 0.0% |
| widget/preferredSize | 8 | 0.1% | 100.0% |
| callback/Future<value> | 7 | 0.1% | 0.0% |
| key/GlobalKey | 7 | 0.1% | 0.0% |
| unbridgeable/abstract-no-impl [iterable] | 6 | 0.1% | 0.0% |
| data/ctor [iterable] | 6 | 0.1% | 100.0% |
| primitive/String [iterable] | 6 | 0.1% | 100.0% |
| unbridgeable/abstract-user-subclass | 6 | 0.1% | 0.0% |
| unbridgeable/needs-nested-widget/callback [set] | 5 | 0.1% | 0.0% |
| builder/context-only [map] | 4 | 0.1% | 0.0% |
| dynamic/dynamic | 4 | 0.1% | 100.0% |
| primitive/int [list] | 3 | 0.0% | 100.0% |
| generic/type-parameter [set] | 3 | 0.0% | 100.0% |
| unbridgeable/binary/typed-data | 2 | 0.0% | 0.0% |
| enum/enum [set] | 2 | 0.0% | 100.0% |
| unbridgeable/abstract-no-impl [list] | 2 | 0.0% | 0.0% |
| primitive/String [set] | 2 | 0.0% | 100.0% |
| unbridgeable/future/stream | 2 | 0.0% | 0.0% |
| primitive/String [map] | 1 | 0.0% | 100.0% |
| unbridgeable/private/unexported-type | 1 | 0.0% | 0.0% |
| primitive/double [list] | 1 | 0.0% | 100.0% |
| primitive/double [map] | 1 | 0.0% | 100.0% |
| handle/listenable [list] | 1 | 0.0% | 100.0% |
| data/union [map] | 1 | 0.0% | 100.0% |
| enum/enum [list] | 1 | 0.0% | 100.0% |
| unbridgeable/no-usable-constructor [list] | 1 | 0.0% | 0.0% |
| primitive/bool [list] | 1 | 0.0% | 100.0% |
| handle/focus [list] | 1 | 0.0% | 100.0% |

## Parameters by family (primary ctor only)

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data | 1424 | 26.2% | 100.0% |
| primitive | 1366 | 25.1% | 100.0% |
| callback | 582 | 10.7% | 80.1% |
| widget | 571 | 10.5% | 97.7% |
| key | 545 | 10.0% | 98.9% |
| enum | 497 | 9.1% | 100.0% |
| handle | 220 | 4.0% | 100.0% |
| builder | 101 | 1.9% | 0.0% |
| unbridgeable | 75 | 1.4% | 0.0% |
| generic | 30 | 0.6% | 100.0% |
| dynamic | 23 | 0.4% | 100.0% |

## Data-class params: full vs partial

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data (all ctor params bridgeable) | 1850 | 94.9% | 100.0% |
| data (some optional ctor params dropped) | 99 | 5.1% | 100.0% |

## Cumulative coverage by rule family

| rule families implemented | params covered (all ctors) | params covered (primary ctors) | widgets fully covered (primary ctor) | widgets usable (all must-supply params covered) |
|---|---:|---:|---:|---:|
| primitives + enums (+ key ignored) | 3394 (45.6%) | 2402 (44.2%) | 12 (2.2%) | 181 (33.3%) |
| + widget slots (child/children/named slots) | 4096 (55.0%) | 2960 (54.5%) | 100 (18.4%) | 305 (56.1%) |
| + void callbacks with encodable args | 4685 (62.9%) | 3426 (63.0%) | 108 (19.9%) | 312 (57.4%) |
| + data classes (recursive ctor rule, unions) + static-const enum-likes | 6634 (89.1%) | 4850 (89.3%) | 278 (51.1%) | 425 (78.1%) |
| + handles (Listenable/controllers/FocusNode via node.handle) | 6932 (93.1%) | 5070 (93.3%) | 366 (67.3%) | 462 (84.9%) |
| + generics / Object as raw JSON | 6996 (94.0%) | 5123 (94.3%) | 385 (70.8%) | 471 (86.6%) |
| + nested widgets/callbacks/handles inside data classes (wire extension) | 7019 (94.3%) | 5141 (94.6%) | 395 (72.6%) | 482 (88.6%) |

## What keeps widgets from being fully covered (primary ctor, after all rule families)

| class of blocking param | widgets with >=1 such param | widgets where it is must-supply |
|---|---:|---:|
| callback/sync-return | 51 | 5 |
| builder/unencodable args | 47 | 20 |
| builder/encodable args | 21 | 13 |
| unbridgeable/abstract-no-impl | 16 | 4 |
| builder/context-only | 15 | 4 |
| unbridgeable/no-usable-constructor | 11 | 3 |
| unbridgeable/map-key | 10 | 3 |
| callback/void(unencodable args) | 10 | 0 |
| widget/subtype | 10 | 2 |
| callback/Future<value> | 6 | 4 |
| unbridgeable/needs-nested-widget/callback | 6 | 2 |
| unbridgeable/framework-object | 5 | 3 |
| key/GlobalKey | 5 | 0 |
| callback/Future<void> | 4 | 1 |
| unbridgeable/abstract-user-subclass | 3 | 2 |
| unbridgeable/future/stream | 2 | 0 |

## Top 50 parameter types

| # | type | params | cum % | class |
|---:|---|---:|---:|---|
| 1 | `bool` | 992 | 13.3% | primitive/bool |
| 2 | `Key` | 680 | 22.5% | key/key |
| 3 | `double` | 615 | 30.7% | primitive/double |
| 4 | `Widget` | 614 | 39.0% | widget/slot (child, children or named slot) |
| 5 | `Color` | 545 | 46.3% | data/union |
| 6 | `String` | 260 | 49.8% | primitive/String |
| 7 | `void Function()` | 246 | 53.1% | callback/void() |
| 8 | `EdgeInsetsGeometry` | 152 | 55.1% | data/union |
| 9 | `int` | 134 | 56.9% | primitive/int |
| 10 | `Clip` | 127 | 58.6% | enum/enum |
| 11 | `FocusNode` | 93 | 59.9% | handle/focus |
| 12 | `TextStyle` | 90 | 61.1% | data/ctor |
| 13 | `void Function(bool)` | 87 | 62.3% | callback/void(encodable args) |
| 14 | `List<Widget>` | 74 | 63.3% | widget/slot (child, children or named slot) |
| 15 | `WidgetStateProperty<Color?>` | 70 | 64.2% | data/union |
| 16 | `Duration` | 64 | 65.1% | data/ctor |
| 17 | `MouseCursor` | 63 | 65.9% | data/enumlike-only |
| 18 | `AlignmentGeometry` | 53 | 66.6% | data/union |
| 19 | `ShapeBorder` | 52 | 67.3% | data/union |
| 20 | `DragStartBehavior` | 43 | 67.9% | enum/enum |
| 21 | `Curve` | 42 | 68.5% | data/union |
| 22 | `BoxConstraints` | 41 | 69.0% | data/ctor |
| 23 | `Axis` | 39 | 69.5% | enum/enum |
| 24 | `ScrollController` | 38 | 70.1% | handle/controller |
| 25 | `void Function(int)` | 37 | 70.5% | callback/void(encodable args) |
| 26 | `ScrollPhysics` | 36 | 71.0% | data/union |
| 27 | `TextDirection` | 33 | 71.5% | enum/enum |
| 28 | `HitTestBehavior` | 32 | 71.9% | enum/enum |
| 29 | `EdgeInsets` | 32 | 72.3% | data/ctor |
| 30 | `Offset` | 30 | 72.7% | data/ctor |
| 31 | `WidgetStatesController` | 30 | 73.1% | handle/controller |
| 32 | `MaterialTapTargetSize` | 29 | 73.5% | enum/enum |
| 33 | `VisualDensity` | 28 | 73.9% | data/ctor |
| 34 | `T & Object` | 26 | 74.3% | generic/type-parameter |
| 35 | `Object` | 26 | 74.6% | dynamic/Object |
| 36 | `Animation<double>` | 24 | 74.9% | handle/animation |
| 37 | `IconThemeData` | 24 | 75.3% | data/union |
| 38 | `ButtonStyle` | 24 | 75.6% | data/ctor |
| 39 | `FilterQuality` | 23 | 75.9% | enum/enum |
| 40 | `BorderSide` | 23 | 76.2% | data/ctor |
| 41 | `void Function(String)` | 22 | 76.5% | callback/void(encodable args) |
| 42 | `DateTime` | 22 | 76.8% | data/ctor |
| 43 | `ScrollCacheExtent` | 21 | 77.1% | data/union |
| 44 | `TextAlign` | 18 | 77.3% | enum/enum |
| 45 | `BlendMode` | 17 | 77.5% | enum/enum |
| 46 | `void Function(T?)` | 17 | 77.8% | callback/void(encodable args) |
| 47 | `BorderRadius` | 17 | 78.0% | data/ctor |
| 48 | `ImageProvider<Object>` | 17 | 78.2% | data/union |
| 49 | `OutlinedBorder` | 17 | 78.4% | data/union |
| 50 | `int? Function(Key)` | 16 | 78.7% | callback/sync-return |

Long tail: 598 distinct types; top 50 cover 78.7%; 548 types beyond the top 50 cover 21.3%; 257 types occur once, 416 occur <= 3 times.

Distinct types per family: key=4, callback=119, data=180, widget=11, unbridgeable=46, primitive=11, handle=53, enum=111, builder=58, generic=3, dynamic=2

## Data-class types directly used as widget params (175 distinct)

| type | params | shape | ctor variants | concrete classes in union | static consts | dropped optional params | rejected ctors |
|---|---:|---|---:|---:|---:|---:|---:|
| `Color` | 545 | union | 9 | 4 | 100 | 0 | 2 |
| `EdgeInsetsGeometry` | 152 | union | 16 | 3 | 4 | 0 | 0 |
| `TextStyle` | 90 | ctor | 1 | 1 | 0 | 0 | 2 |
| `WidgetStateProperty<Color?>` | 70 | union | 1 | 1 | 1 | 0 | 4 |
| `Duration` | 64 | ctor | 1 | 1 | 17 | 0 | 0 |
| `MouseCursor` | 63 | enumlike-only | 0 | 0 | 41 | 0 | 2 |
| `AlignmentGeometry` | 53 | union | 7 | 4 | 42 | 0 | 0 |
| `ShapeBorder` | 52 | union | 27 | 15 | 2 | 0 | 4 |
| `Curve` | 42 | union | 12 | 11 | 52 | 0 | 0 |
| `BoxConstraints` | 41 | ctor | 7 | 1 | 0 | 0 | 0 |
| `ScrollPhysics` | 36 | union | 14 | 9 | 0 | 0 | 0 |
| `EdgeInsets` | 32 | ctor | 5 | 1 | 1 | 0 | 0 |
| `Offset` | 30 | ctor | 2 | 1 | 2 | 0 | 0 |
| `VisualDensity` | 28 | ctor | 1 | 1 | 3 | 0 | 0 |
| `Locale` | 25 | ctor | 2 | 1 | 0 | 0 | 0 |
| `IconThemeData` | 24 | union | 3 | 2 | 0 | 0 | 0 |
| `ButtonStyle` | 24 | ctor | 1 | 1 | 0 | 3 | 0 |
| `BorderSide` | 23 | ctor | 1 | 1 | 1 | 0 | 2 |
| `DateTime` | 22 | ctor | 6 | 1 | 0 | 0 | 0 |
| `ScrollCacheExtent` | 21 | union | 2 | 1 | 0 | 0 | 0 |
| `BorderRadius` | 17 | ctor | 5 | 1 | 1 | 0 | 0 |
| `ImageProvider<Object>` | 17 | union | 4 | 4 | 0 | 0 | 3 |
| `OutlinedBorder` | 17 | union | 14 | 9 | 1 | 0 | 2 |
| `ScrollBehavior` | 16 | union | 3 | 3 | 0 | 0 | 0 |
| `Size` | 15 | ctor | 6 | 1 | 2 | 0 | 0 |
| `TextInputType` | 15 | ctor | 1 | 1 | 13 | 0 | 0 |
| `Decoration` | 14 | union | 5 | 4 | 0 | 0 | 0 |
| `Radius` | 13 | ctor | 2 | 1 | 1 | 0 | 0 |
| `StrutStyle` | 11 | ctor | 2 | 1 | 1 | 0 | 0 |
| `BorderRadiusGeometry` | 10 | union | 16 | 3 | 3 | 0 | 0 |
| `AttributedString` | 10 | ctor | 1 | 1 | 0 | 0 | 0 |
| `TextSelectionControls` | 10 | union | 5 | 5 | 0 | 0 | 0 |
| `ThemeData` | 10 | ctor | 5 | 1 | 0 | 5 | 1 |
| `TextSelectionToolbarAnchors` | 9 | ctor | 1 | 1 | 0 | 0 | 1 |
| `TextScaler` | 9 | union | 1 | 1 | 1 | 0 | 0 |
| `TextHeightBehavior` | 9 | ctor | 1 | 1 | 0 | 0 | 0 |
| `TextMagnifierConfiguration` | 9 | ctor | 1 | 1 | 1 | 1 | 0 |
| `BoxDecoration` | 9 | ctor | 1 | 1 | 0 | 0 | 0 |
| `Alignment` | 9 | union | 4 | 2 | 18 | 0 | 0 |
| `WidgetStateProperty<double?>` | 9 | union | 1 | 1 | 0 | 0 | 2 |
| `Rect` | 9 | ctor | 5 | 1 | 2 | 0 | 0 |
| `ChipAnimationStyle` | 9 | ctor | 1 | 1 | 0 | 0 | 0 |
| `TextInputFormatter` | 8 | union | 4 | 2 | 0 | 0 | 1 |
| `SliverGridDelegate` | 8 | union | 2 | 2 | 0 | 0 | 0 |
| `AnimationStyle` | 8 | ctor | 1 | 1 | 1 | 0 | 0 |
| `WidgetStateProperty<TextStyle?>` | 7 | union | 1 | 1 | 0 | 0 | 4 |
| `ContextMenuButtonItem` | 6 | ctor | 1 | 1 | 0 | 1 | 0 |
| `SpellCheckConfiguration` | 6 | ctor | 2 | 1 | 0 | 1 | 0 |
| `InputBorder` | 6 | union | 3 | 3 | 1 | 0 | 2 |
| `TextAlignVertical` | 6 | ctor | 1 | 1 | 3 | 0 | 0 |
| `CalendarDelegate<DateTime>` | 5 | union | 1 | 1 | 0 | 0 | 0 |
| `MenuStyle` | 5 | ctor | 1 | 1 | 0 | 0 | 0 |
| `WidgetStateProperty<Icon?>` | 5 | union | 1 | 1 | 0 | 1 | 2 |
| `Border` | 5 | ctor | 4 | 1 | 0 | 0 | 0 |
| `NavigatorObserver` | 5 | union | 2 | 2 | 0 | 1 | 0 |
| `SystemUiOverlayStyle` | 5 | ctor | 1 | 1 | 2 | 0 | 0 |
| `BackButtonDispatcher` | 4 | union | 2 | 2 | 0 | 0 | 0 |
| `InputDecoration` | 4 | ctor | 2 | 1 | 0 | 15 | 0 |
| `EdgeInsetsDirectional` | 4 | ctor | 4 | 1 | 1 | 0 | 0 |
| `WidgetStateProperty<MouseCursor?>` | 4 | union | 1 | 1 | 3 | 0 | 4 |
| `MenuSerializableShortcut` | 3 | union | 2 | 2 | 0 | 0 | 0 |
| `InlineSpan` | 3 | union | 1 | 1 | 0 | 2 | 1 |
| `AssetBundle` | 3 | union | 2 | 2 | 0 | 0 | 0 |
| `MessageCodec<dynamic>` | 3 | union | 4 | 4 | 0 | 0 | 0 |
| `WidgetStateProperty<MouseCursor>` | 3 | union | 1 | 1 | 3 | 0 | 4 |
| `ImageFilter` | 3 | union | 9 | 2 | 0 | 0 | 2 |
| `CupertinoThemeData` | 3 | union | 2 | 2 | 0 | 0 | 0 |
| `SelectionRegistrar` | 3 | union | 2 | 2 | 0 | 0 | 0 |
| `BoxShadow` | 3 | ctor | 1 | 1 | 0 | 0 | 0 |
| `Matrix4` | 3 | ctor | 14 | 1 | 0 | 0 | 7 |

## Unbridgeable remainder (119 params, 46 distinct types)

- 9 x `SliverChildDelegate` (unbridgeable/needs-nested-widget/callback)
- 8 x `Map<ShortcutActivator, Intent>` (unbridgeable/map-key)
- 8 x `ToolbarOptions` (unbridgeable/no-usable-constructor)
- 8 x `Map<Type, Action<Intent>>` (unbridgeable/map-key)
- 6 x `Iterable<LocalizationsDelegate<dynamic>>` (unbridgeable/abstract-no-impl)
- 5 x `BuildContext` (unbridgeable/framework-object)
- 5 x `ContentInsertionConfiguration` (unbridgeable/needs-nested-widget/callback)
- 5 x `InteractiveInkFeatureFactory` (unbridgeable/abstract-no-impl)
- 5 x `EditableTextState` (unbridgeable/framework-object)
- 5 x `Set<Factory<OneSequenceGestureRecognizer>>` (unbridgeable/needs-nested-widget/callback)
- 4 x `RadioGroupRegistry<T>` (unbridgeable/abstract-no-impl)
- 3 x `RouterConfig<Object>` (unbridgeable/no-usable-constructor)
- 3 x `RouteInformationParser<Object>` (unbridgeable/abstract-no-impl)
- 3 x `RouterDelegate<Object>` (unbridgeable/abstract-user-subclass)
- 2 x `List<ExpansionPanel>` (unbridgeable/needs-nested-widget/callback)
- 2 x `Map<CustomSemanticsAction, void Function()>` (unbridgeable/map-key)
- 2 x `FlowDelegate` (unbridgeable/abstract-no-impl)
- 2 x `List<DataColumn>` (unbridgeable/needs-nested-widget/callback)
- 2 x `List<BottomNavigationBarItem>` (unbridgeable/needs-nested-widget/callback)
- 2 x `RenderView` (unbridgeable/framework-object)
- 2 x `Uint8List` (unbridgeable/binary/typed-data)
- 2 x `FlutterView` (unbridgeable/no-usable-constructor)
- 2 x `ListWheelChildDelegate` (unbridgeable/needs-nested-widget/callback)
- 2 x `List<LocalizationsDelegate<dynamic>>` (unbridgeable/abstract-no-impl)
- 1 x `List<Page<dynamic>>` (unbridgeable/needs-nested-widget/callback)
- 1 x `Stream<T>` (unbridgeable/future/stream)
- 1 x `File` (unbridgeable/private/unexported-type)
- 1 x `RouteInformationParser<T>` (unbridgeable/abstract-no-impl)
- 1 x `RouterDelegate<T>` (unbridgeable/abstract-user-subclass)
- 1 x `List<Step>` (unbridgeable/needs-nested-widget/callback)
- 1 x `Map<ShortcutActivator, void Function()>` (unbridgeable/map-key)
- 1 x `SliverPersistentHeaderDelegate` (unbridgeable/abstract-no-impl)
- 1 x `SnapshotPainter` (unbridgeable/abstract-user-subclass)
- 1 x `SemanticsGestureDelegate` (unbridgeable/abstract-no-impl)
- 1 x `Map<Type, GestureRecognizerFactory<GestureRecognizer>>` (unbridgeable/map-key)
- 1 x `RenderObjectWithChildMixin<T>` (unbridgeable/framework-object)
- 1 x `SelectableRegionState` (unbridgeable/framework-object)
- 1 x `RenderBox` (unbridgeable/framework-object)
- 1 x `ButtonBarThemeData` (unbridgeable/no-usable-constructor)
- 1 x `Image` (unbridgeable/no-usable-constructor)

## Callbacks that are not plain void+encodable (161 params, 52 distinct types)

- 16 x `int? Function(Key)` (callback/sync-return)
- 13 x `void Function(Object, StackTrace?)` (callback/void(unencodable args))
- 11 x `double? Function(int, SliverLayoutDimensions)` (callback/sync-return)
- 10 x `Route<dynamic>? Function(RouteSettings)` (callback/sync-return)
- 9 x `bool Function(ScrollNotification)` (callback/sync-return)
- 7 x `Future<void> Function()` (callback/Future<void>)
- 6 x `bool Function(NavigationNotification)` (callback/sync-return)
- 6 x `String Function(BuildContext)` (callback/sync-return)
- 6 x `Locale? Function(List<Locale>?, Iterable<Locale>)` (callback/sync-return)
- 6 x `Locale? Function(Locale?, Iterable<Locale>)` (callback/sync-return)
- 4 x `DragBoundaryDelegate<Rect>? Function(BuildContext)` (callback/sync-return)
- 4 x `bool Function(DateTime)` (callback/sync-return)
- 3 x `String Function(double)` (callback/sync-return)
- 3 x `List<Route<dynamic>> Function(String)` (callback/sync-return)
- 3 x `String? Function(T?)` (callback/sync-return)
- 3 x `void Function(String, Map<String, dynamic>)` (callback/void(unencodable args))
- 2 x `int? Function(List<DropdownMenuEntry<T>>, String)` (callback/sync-return)
- 2 x `Offset Function(Draggable<Object>, BuildContext, Offset)` (callback/sync-return)
- 2 x `bool Function(int)` (callback/sync-return)
- 2 x `List<DropdownMenuEntry<T>> Function(List<DropdownMenuEntry<T>>, String)` (callback/sync-return)
- 2 x `InputDecoration Function(BuildContext, MenuController)` (callback/sync-return)
- 2 x `KeyEventResult Function(FocusNode, KeyEvent)` (callback/sync-return)
- 2 x `KeyEventResult Function(FocusNode, RawKeyEvent)` (callback/sync-return)
- 2 x `Future<bool> Function()` (callback/Future<value>)
- 2 x `String? Function(String?)` (callback/sync-return)
- 2 x `double Function(ScrollIncrementDetails)` (callback/sync-return)
- 2 x `FutureOr<void> Function()` (callback/Future<void>)
- 2 x `String Function(T)` (callback/sync-return)
- 2 x `FutureOr<Iterable<Widget>> Function(BuildContext, SearchController)` (callback/Future<value>)
- 2 x `Offset Function(TooltipPositionContext)` (callback/sync-return)

## Builders (147 params, 58 distinct types)

- 14 x `Widget? Function(BuildContext, int)` (builder/encodable args)
- 11 x `Widget Function(BuildContext, Object, StackTrace?)` (builder/unencodable args)
- 10 x `Widget Function(BuildContext, EditableTextState)` (builder/unencodable args)
- 8 x `Widget Function(BuildContext, Widget?)` (builder/unencodable args)
- 7 x `Widget Function(BuildContext, int, Animation<double>)` (builder/unencodable args)
- 5 x `Widget Function(BuildContext, int)` (builder/encodable args)
- 5 x `Widget Function(BuildContext, Widget, int?, bool)` (builder/unencodable args)
- 4 x `Map<String, Widget Function(BuildContext)>` (builder/context-only)
- 4 x `Widget Function(BuildContext)` (builder/context-only)
- 4 x `Widget Function(BuildContext, Animation<double>)` (builder/unencodable args)
- 4 x `Widget Function(BuildContext, String)` (builder/encodable args)
- 4 x `Widget Function(Widget, int, Animation<double>)` (builder/unencodable args)
- 3 x `Widget Function(BuildContext, T, Widget?)` (builder/unencodable args)
- 3 x `Widget Function(BuildContext, {required GlobalKey<State<StatefulWidget>> key, required void Function() onPressed, required String semanticsLabel})` (builder/context-only)
- 3 x `Widget Function(BuildContext, {required void Function() onPressed, required String semanticsLabel, bool usesDefaultAlignment})` (builder/context-only)
- 3 x `Widget Function(BuildContext, {required void Function() onPressed, required bool selectionOnTapEnabled, required String semanticsLabel})` (builder/context-only)
- 3 x `Widget Function(BuildContext, MenuController, Widget?)` (builder/unencodable args)
- 2 x `Widget Function(BuildContext, AsyncSnapshot<T>)` (builder/encodable args)
- 2 x `Widget? Function(BuildContext, {required int columnCount, required int selectedIndex})` (builder/context-only)
- 2 x `Widget Function(BuildContext, TextEditingController, FocusNode, void Function())` (builder/unencodable args)
- 2 x `Widget Function(BuildContext, Widget, ImageChunkEvent?)` (builder/unencodable args)
- 2 x `Widget Function(BuildContext, Orientation)` (builder/encodable args)
- 2 x `Widget Function(BuildContext, void Function(T), Iterable<T>)` (builder/unencodable args)
- 2 x `Widget Function(BuildContext, Animation<double>, Widget?)` (builder/unencodable args)
- 2 x `Widget Function(BuildContext, SelectableRegionState)` (builder/unencodable args)
- 2 x `List<Widget> Function(BuildContext)` (builder/context-only)
- 2 x `Widget Function(Iterable<Widget>)` (builder/unencodable args)
- 2 x `Widget? Function(BuildContext, {required int currentLength, required bool isFocused, required int? maxLength})` (builder/context-only)
- 1 x `Widget Function(BuildContext, OverlayChildLayoutInfo)` (builder/encodable args)
- 1 x `List<Widget> Function(BuildContext, bool)` (builder/encodable args)

## Widget-subtype slots (13 params, 6 distinct types)

- 7 x `Icon` (widget/subtype)
- 2 x `List<DropdownMenuItem<T>>` (widget/subtype)
- 1 x `SnackBarAction` (widget/subtype)
- 1 x `ObstructingPreferredSizeWidget` (widget/subtype)
- 1 x `CupertinoTabBar` (widget/subtype)
- 1 x `CupertinoTheme` (widget/subtype)

## Handles (298 params, 53 distinct types)

- 93 x `FocusNode` (handle/focus)
- 38 x `ScrollController` (handle/controller)
- 30 x `WidgetStatesController` (handle/controller)
- 24 x `Animation<double>` (handle/animation)
- 12 x `TextEditingController` (handle/controller)
- 8 x `MenuController` (handle/controller)
- 6 x `UndoHistoryController` (handle/controller)
- 5 x `Animation<Color?>` (handle/animation)
- 4 x `TabController` (handle/controller)
- 4 x `RouteInformationProvider` (handle/listenable)
- 4 x `ViewportOffset` (handle/listenable)
- 4 x `AnimationController` (handle/controller)
- 4 x `CarouselController` (handle/controller)
- 3 x `CustomClipper<Rect>` (handle/listenable)
- 3 x `LayerLink` (handle/listenable)
- 3 x `ExpansibleController` (handle/controller)
- 3 x `SliverOverlapAbsorberHandle` (handle/listenable)
- 3 x `PageController` (handle/controller)
- 2 x `ValueNotifier<EdgeInsets>` (handle/listenable)
- 2 x `CustomPainter` (handle/listenable)
- 2 x `OverlayPortalController` (handle/controller)
- 2 x `CustomClipper<Path>` (handle/listenable)
- 2 x `FocusScopeNode` (handle/focus)
- 2 x `Listenable` (handle/animation)
- 2 x `TransformationController` (handle/controller)

## Generic / dynamic (64 params, 5 distinct types)

- 26 x `T & Object` (generic/type-parameter)
- 26 x `Object` (dynamic/Object)
- 5 x `T` (generic/type-parameter)
- 4 x `dynamic` (dynamic/dynamic)
- 3 x `Set<T>` (generic/type-parameter)

## Keys (687 params, 4 distinct types)

- 680 x `Key` (key/key)
- 4 x `GlobalKey<NavigatorState>` (key/GlobalKey)
- 2 x `GlobalKey<ScaffoldMessengerState>` (key/GlobalKey)
- 1 x `GlobalKey<State<StatefulWidget>>` (key/GlobalKey)

