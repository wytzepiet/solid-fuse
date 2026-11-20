# 02 — Driving generation from Dart APIs with `package:analyzer`

Spike code: `experiments/interop/gen/` (standalone Flutter package, `./run.sh` reproduces everything below).
Environment: Flutter 3.50.1 / Dart 3.14.0, analyzer 14.7.0, TypeScript 6.0.2, fl_chart 1.3.1, percent_indicator 4.2.5.

## Verdict

Yes. Resolved elements from `package:analyzer` are enough to emit **both** the TS prop interface and the Dart adapter, for Flutter's own widgets and for pub packages, with no per-widget code.

- **Coverage with zero per-type special cases: 94.0 % of all 7,443 widget constructor parameters** (93.5 % if the 687 `Key` parameters, which are simply ignored, are left out). 385 of 544 widgets (70.8 %) are covered completely; 471 (86.6 %) are usable, meaning every parameter that must be supplied is covered.
- **Color, EdgeInsets, Duration and friends do fall out of one recursive rule.** They are not special: "a class is an object keyed by its constructor's parameter names; a named constructor or subclass is picked by a `$` tag; a static const is a string". That one rule plus enums moves coverage from 62.9 % to 89.1 %. What does not fall out is a *pleasant* spelling (`"#336699"`, `16`, `300`). Those are 7 small hand-written codecs layered in front of the derived one.
- **Proven end to end**: the generator emitted adapters for the whole `material.dart` export (498 of 604 widget constructors, 16,140 lines of Dart, 377 KB of `.d.ts`) and that output passes `flutter analyze` and `tsc` with no errors. 11 widget tests pump generated adapters from JSON props and assert on the real Flutter widgets, including callback round trips. fl_chart and percent_indicator generated unassisted, first try, and render.
- **What stays hard** is not types. It is anything where Dart calls JS and needs an answer in the same frame: builders (2.0 % of parameters, but a required builder rules out 50 of the 604 widget constructors, `ListView.builder` among them) and value-returning callbacks (1.7 %).

## Part 1 — Survey

`tool/survey.dart` loads the resolved element model for `widgets.dart`, `material.dart` and `cupertino.dart`, takes every public, concrete `Widget` subclass from their export namespaces, and classifies every parameter of every public non-deprecated constructor with the same rule engine the generator uses (`tool/src/classify.dart`). Full output: `gen/out/survey.md`; one row per parameter in `gen/out/survey.json`.

Population: **544 widgets** (297 from widgets, 189 material, 58 cupertino), 685 constructors (675 generative, 10 factory), **7,443 parameters**, 598 distinct parameter types. 772 parameters must be supplied (required and non-nullable), 16 are positional, 1,715 have a default, 97 are deprecated. 36 widget classes are generic.

Note: Flutter 3.50 marks `package:flutter/material.dart` and `cupertino.dart` as deprecated in favour of `package:material_ui` / `package:cupertino_ui`. The survey covers the libraries as asked; nothing in the approach depends on where the widgets live, which is rather the point.

### Parameters by family

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

"Covered" means the general rules below produce a decoder (or callback wiring) without any knowledge of the specific type.

Finer breakdown of the families that are not uniform:

| class | params | % of all | covered |
|---|---:|---:|---|
| data: abstract type or type with subclasses, tagged union | 1,198 | 16.1 % | yes |
| data: single class, constructor(s) only | 643 | 8.6 % | yes |
| data: only static consts usable (e.g. `MouseCursor`) | 70 | 0.9 % | yes |
| data in a `List`/`Set`/`Map` | 38 | 0.5 % | yes |
| widget: `child` | 356 | 4.8 % | yes |
| widget: named slot (`leading`, `title`, ...) | 258 | 3.5 % | yes |
| widget: `children` | 48 | 0.6 % | yes |
| widget: other `List<Widget>` (`actions`, `slivers`) | 32 | 0.4 % | yes, needs a renderer tweak |
| widget: `PreferredSizeWidget` | 8 | 0.1 % | yes, with a hack |
| widget: specific subtype (`Icon`, `DropdownMenuItem<T>`) | 13 | 0.2 % | no |
| callback: `void Function()` | 246 | 3.3 % | yes |
| callback: void, arguments encodable | 343 | 4.6 % | yes |
| callback: void, arguments not encodable | 20 | 0.3 % | no |
| callback: returns a value synchronously | 125 | 1.7 % | no |
| callback: returns a `Future` | 16 | 0.2 % | no |
| builder: returns `Widget` | 147 | 2.0 % | no |
| handle: `FocusNode` 95, controllers 130, `Animation` 38, other `Listenable` 35 | 298 | 4.0 % | yes |

Of the 1,949 data-class parameters, 1,850 (94.9 %) use types where every constructor parameter is itself bridgeable; 99 (5.1 %) use types where some optional constructor parameters are dropped (for example `InputDecoration` loses its 15 widget-typed fields, `ButtonStyle` loses 3).

### Cumulative coverage as rule families are added

| rule families implemented | params covered (all ctors) | params covered (primary ctors) | widgets fully covered (primary ctor) | widgets usable (all must-supply params covered) |
|---|---:|---:|---:|---:|
| primitives + enums (+ key ignored) | 3394 (45.6%) | 2402 (44.2%) | 12 (2.2%) | 181 (33.3%) |
| + widget slots (child/children/named slots) | 4096 (55.0%) | 2960 (54.5%) | 100 (18.4%) | 305 (56.1%) |
| + void callbacks with encodable args | 4685 (62.9%) | 3426 (63.0%) | 108 (19.9%) | 312 (57.4%) |
| + data classes (recursive ctor rule, unions) + static-const enum-likes | 6634 (89.1%) | 4850 (89.3%) | 278 (51.1%) | 425 (78.1%) |
| + handles (Listenable/controllers/FocusNode via node.handle) | 6932 (93.1%) | 5070 (93.3%) | 366 (67.3%) | 462 (84.9%) |
| + generics / Object as raw JSON | 6996 (94.0%) | 5123 (94.3%) | 385 (70.8%) | 471 (86.6%) |
| + nested widgets/callbacks/handles inside data classes (wire extension) | 7019 (94.3%) | 5141 (94.6%) | 395 (72.6%) | 482 (88.6%) |

So the direct answer: **one recursive data-class rule + enums + static-const enum-likes covers 35.6 % of all parameters on its own (2,647), and with primitives, slots and void callbacks takes the total to 89.1 %; adding handles and raw-JSON generics gives 94.0 %, all with zero per-type special cases.** Each of the three widest steps (slots, data classes, handles) is one rule.

### What blocks the remaining widgets

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

Of the 772 must-supply parameters, 125 are uncovered, and they are almost all builders, synchronous callbacks or delegate objects.

### Top 50 parameter types

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

Long tail: 598 distinct types. The top 50 cover 78.7 % of parameters; the other 548 cover 21.3 %; 257 types occur exactly once and 416 occur three times or fewer. Distinct types per family: enum 111, data 180, callback 119, builder 58, handle 53, unbridgeable 46. **The tail is long but it is the same few shapes repeated**, which is why the general rules reach it: 180 distinct data types and 111 enums are covered by two rules.

### The unbridgeable remainder (119 parameters, 46 types)

Mostly delegate and framework objects: `SliverChildDelegate` (9), `Map<ShortcutActivator, Intent>` (8), `Map<Type, Action<Intent>>` (8), `ToolbarOptions` (8), `LocalizationsDelegate` lists (8), `InteractiveInkFeatureFactory` (5), `BuildContext` (5), `EditableTextState` (5), `RouterDelegate`/`RouteInformationParser`/`RouterConfig` (11), `FlowDelegate`, `SliverPersistentHeaderDelegate`, `Uint8List` (2), `File` (1). Lists of data classes that contain widgets (`List<BottomNavigationBarItem>`, `List<DataColumn>`, `List<Step>`, `List<ExpansionPanel>`) sit here too until node refs can be nested (see limits).

### Which types deserve a hand-written "nice" input

The derived form always works; these are the ones where it is unpleasant enough, or used often enough, to justify a codec:

| type | params | derived form (works today) | nice form worth adding |
|---|---:|---|---|
| `Color` | 545 (+107 via `WidgetStateProperty<…>`) | `"Colors.red"`, `{value: 0xFF336699}`, `{$:"fromRGBO", r, g, b, opacity}` | `"#336699"`, `"red"`, `{r,g,b,a}` (existing `parseColor`) |
| `EdgeInsetsGeometry` / `EdgeInsets` | 152 / 32 | `{$:"all", value: 16}`, `{$:"symmetric", horizontal: 8}`, `"zero"` | `16` |
| `Duration` | 64 | `{milliseconds: 300}`, `"Durations.short2"` | `300` (ms) |
| `BorderRadius(Geometry)` / `Radius` | 27 / 13 | `{$:"circular", radius: 12}` | `12` |
| `FontWeight` | inside `TextStyle` (90) | `"w700"`, `"bold"` | `700` |
| `IconData` | 2 direct, but every icon | **nothing derivable** (see below) | `{codePoint, fontFamily}` or a generated icon table |
| `WidgetStateProperty<T>` | 107 | only `{$:"WidgetStatePropertyAll", value}` | `{default, hovered, pressed, disabled, …}` → `resolveWith` |
| `Decoration` | 14 | `{$:"BoxDecoration", …}` (tag is mandatory because the type is abstract) | a default arm so the tag can be omitted |
| `ImageProvider` | 17 | `{$:"NetworkImage", url}`, `{$:"AssetImage", assetName}` | `"https://…"` string |
| `Offset`, `Size` | 30, 15 | `{dx, dy}`, `{width, height}` | optional: `[x, y]` |
| `Locale`, `DateTime` | 16, 22 | `{languageCode, countryCode}`; `DateTime` only `{year}` (SDK defaults are not visible) | `"en-US"`, ISO string / epoch ms |
| `Matrix4` | 3 | `{$:"translationValues", x, y, z}` etc. | `{rotate, scale, translateX, …}` (existing `TransformInput`) |
| `Uint8List` | 2 | none | base64 string |

Everything else in the top 50 (`TextStyle`, `AlignmentGeometry`, `Curve`, `ShapeBorder`, `BoxConstraints`, `ScrollPhysics`, `MouseCursor`, `VisualDensity`, `BorderSide`, `TextInputType`, `IconThemeData`, `ButtonStyle`) reads fine in its derived form: `curve="Curves.easeInOut"`, `alignment="center"`, `shape={{ $: "RoundedRectangleBorder", borderRadius: 8 }}`, `physics={{ $: "BouncingScrollPhysics" }}`.

### How overrides should be expressed

A small registry of codecs keyed by Dart type, sitting **in front of** the derived codec rather than replacing it (`tool/src/overrides.dart`, 7 entries today):

```dart
CodecOverride(type: 'EdgeInsets', tsIn: 'number', decode: 'niceEdgeInsets', inherit: true),
CodecOverride(type: 'Color', tsIn: 'ColorInput', decode: 'niceColor', inherit: true,
              tsOut: 'string', encode: 'niceEncColor'),
CodecOverride(type: 'IconData', tsIn: '{ codePoint: number; … }', decode: 'niceIconData', replace: true),
```

Each entry names an extra TS input type and a hand-written Dart function `T? Function(Object?)` that returns `null` when the value is not in its nice form. The generated decoder tries the hooks first and falls through to the derived switch, so `padding={16}`, `padding={{ $: "only", left: 4 }}` and `padding="zero"` are all valid at once and the TS type is the union. `inherit` makes an override for `EdgeInsets` also apply inside the `EdgeInsetsGeometry` union, so the registry stays one entry per concept rather than one per declared type. `replace` drops the derived arms (used for `IconData`, where nothing can be derived). `encode`/`tsOut` cover the Dart→JS direction for callback payloads. The same file holds per-widget hints (2 entries: JSX children map to `Scaffold.body` and `CustomScrollView.slivers`).

Turning all overrides off changes nothing structural: the same 32 widgets generate and pass analysis (`--no-overrides`), minus `Icon.icon`.

## The rule set (recommended type mapping)

All of this is structural; the only names the engine knows are the framework roots `Widget`, `PreferredSizeWidget`, `Key`, `Listenable`, `BuildContext`, `State`, `RenderObject`, `Element`.

| Dart parameter type | TS type | Wire | Dart adapter |
|---|---|---|---|
| `bool` / `int` / `double` / `num` / `String` | `boolean` / `number` / `string` | JSON | `decBool(p['x'])`, `decDouble(...)` |
| `enum E` | `"a" \| "b"` union alias | name | `fuseEnum(E.values, v)` (one generic helper, no per-enum code) |
| `List<T>` / `Set<T>` / `Iterable<T>` | `T[]` | array | `fuseList<T>(v, dec)` |
| `Map<String\|int\|enum, T>` | `Partial<Record<K, T>>` | object | `fuseMap<K, V>(v, kf, vf)` |
| `Widget child` | JSX `children` | child nodes | `fuseChild(node)` (0 → null, 1 → it, n → existing `flex` convention) |
| `List<Widget> children` | JSX `children` | child nodes | `node.childWidgets` |
| `Widget x` (named slot) | `FuseElement` | `{_node: id}` | `node.widget('x')` |
| `List<Widget> x` | `FuseElement \| FuseElement[]` | array of node refs | `fuseWidgetList(node, 'x')` |
| `PreferredSizeWidget x` | `FuseElement` | `{_node: id}` | `fusePreferredSize(node, 'x')` |
| `void Function()` | `() => void` | `true` | `node.callback('x')` |
| `void Function(A)` | `(a: AOut) => void` | `true`; payload = encoded arg | `p['x'] != true ? null : (a0) => node.callFunction(node.id, 'x', encA(a0))` |
| `void Function(A, B)` | `(args: [a: AOut, b: BOut]) => void` | payload = array | same; `BuildContext` args are omitted |
| class with usable constructor(s) | object type; `$` picks a named ctor | object | generated `decT` |
| abstract class / class with subclasses | tagged union over concrete subtypes' ctors | object with `$: "Sub"` or `"Sub.ctor"` | generated `decT` |
| class with `static const` instances, or a constants namespace (`Colors`, `Curves`, `Durations`, `SystemMouseCursors`) | string literals: `"center"`, `"Curves.easeIn"` | string | `switch` in `decT` |
| `Listenable` subtypes, `*Controller`, `*FocusNode`, `LayerLink` | `FuseHandle<"T">` | `{_node: id}` | `node.handle<T>('x')` |
| `Key` | (not exposed) | — | dropped; `FuseNodeWidget` already keys by node id |
| type parameter `T`, `Object`, `dynamic` | `unknown` | raw JSON | passed through; class instantiated to bounds |
| arguments of callbacks (Dart → JS) | `TOut` interface | object | generated `encT`: getters named like the unnamed constructor's parameters, else public fields |
| builders, value-returning callbacks, `Future` callbacks, delegates, `BuildContext`, typed data | — | — | parameter omitted; constructor skipped if it is required |

Details that make the data rule work in practice:

- **Positional constructor parameters are keyed by their declared name**: `Offset(dx, dy)` → `{dx, dy}`, `EdgeInsets.fromLTRB(left, top, right, bottom)` → `{$: "fromLTRB", left, top, right, bottom}`.
- **Factory constructors on abstract classes count** (`NetworkImage(url)`, `EdgeInsetsGeometry.all`), and generic subclasses are instantiated against the declared type (`WidgetStatePropertyAll<Color?>` for a `WidgetStateProperty<Color?>` parameter).
- **A constructor is usable if every must-supply parameter is bridgeable**; unbridgeable optional ones are dropped and reported.
- **Recursive types** (`TextStyle`, `InlineSpan`, `ImageProvider` → `ResizeImage(ImageProvider)`) just work because each type gets one named decoder and one named TS alias.
- **Default values are regenerated from the evaluated constant**, not copied as text, so private defaults work (`const Color(4285887861)` for a `_kFoo`), and redirecting factories take their defaults from the target constructor.
- **`@mustBeConst` parameters disqualify a constructor** (this is what removes `IconData(codePoint)`).
- Hierarchies with more than 40 concrete subclasses are treated as open; constant namespaces above 400 entries are not inlined (`Icons` has about 8,900).

## Part 2 — Generator spike

`dart run tool/generate.dart` resolves the element model (about 14 s, most of it loading Flutter summaries), then emits per run:

- `lib/generated/<name>.g.dart`: one `StatelessWidget` adapter per widget constructor, a `register<Name>Widgets(FuseRuntime)` function, one decoder per data type and one encoder per callback payload type.
- `ts/generated/<name>.d.ts`: one `XProps` interface per widget constructor with the Dart doc comment as JSDoc and `@default` where the default is a literal or enum, an `export declare function X(props): FuseElement`, plus shared enum aliases, data type aliases and `…Out` payload interfaces.
- `out/<name>.report.json`: per widget: parameters emitted, dropped and why, notes on every hack applied, sizes.

### Result for the requested widgets

Requested 34 constructors (the 16 named in the brief, plus named-constructor and awkward probes). **32 generated; 653 of 721 parameters emitted** (the 68 not emitted: 32 `key`, 14 deprecated, the rest builders, sync callbacks and delegates). Skipped: `ListView.builder` (required `itemBuilder`), `BottomNavigationBar` (required `List<BottomNavigationBarItem>`, a data class holding widgets).

| component | params emitted | Dart lines (adapter) | `.d.ts` bytes (interface) | not bridged |
|---|---:|---:|---:|---|
| `Text` | 16/18 | 30 | 1671 | textScaleFactor |
| `Container` | 14/15 | 26 | 1529 |  |
| `Padding` | 2/3 | 14 | 459 |  |
| `GestureDetector` | 65/66 | 77 | 11546 |  |
| `Opacity` | 3/4 | 15 | 592 |  |
| `Icon` | 13/14 | 25 | 1398 |  |
| `ElevatedButton` | 10/11 | 22 | 1194 |  |
| `ElevatedButtonIcon` | 12/13 | 24 | 1191 |  |
| `ListTile` | 37/38 | 49 | 3915 |  |
| `Switch` | 24/28 | 38 | 2402 | activeColor, onActiveThumbImageError, onInactiveThumbImageError |
| `Slider` | 20/23 | 34 | 2278 | semanticFormatterCallback, year2023 |
| `AppBar` | 32/34 | 46 | 4103 | notificationPredicate |
| `Scaffold` | 26/28 | 40 | 4255 | bottomSheetScrimBuilder |
| `SliverAppBar` | 37/39 | 51 | 4061 | onStretchTrigger |
| `CupertinoButton` | 17/19 | 31 | 2047 | minSize |
| `CupertinoButtonFilled` | 17/19 | 31 | 2076 | minSize |
| `AnimatedContainer` | 16/17 | 28 | 1795 |  |
| `Wrap` | 10/11 | 22 | 1576 |  |
| `Column` | 8/9 | 20 | 1212 |  |
| `Stack` | 5/6 | 17 | 1233 |  |
| `ImageNetwork` | 22/26 | 36 | 2358 | errorBuilder, frameBuilder, loadingBuilder |
| `ImageAsset` | 22/25 | 36 | 2251 | errorBuilder, frameBuilder |
| `ListView` | 20/23 | 34 | 2292 | cacheExtent, itemExtentBuilder |
| `TextField` | 64/72 | 78 | 5032 | buildCounter, contentInsertionConfiguration, contextMenuBuilder, groupId, onAppPrivateCommand, scribbleEnabled, toolbarOptions |
| `DropdownButton` | 28/31 | 43 | 3328 | items, selectedItemBuilder |
| `Checkbox` | 19/20 | 31 | 2010 |  |
| `Radio` | 17/21 | 31 | 1776 | groupRegistry, groupValue, onChanged |
| `CustomScrollView` | 17/20 | 31 | 2075 | cacheExtent, center |
| `TextRich` | 16/18 | 30 | 1694 | textScaleFactor |
| `CircularProgressIndicator` | 13/15 | 27 | 1511 | year2023 |
| `Card` | 10/11 | 22 | 1422 |  |
| `Tooltip` | 21/24 | 35 | 2059 | height, positionDelegate |

Shared code for those 32 widgets: 2,040 lines of Dart codecs (76 decoders with 315 constructor variants and 431 constants, 19 encoders), 64.5 KB of shared TS types (54 enums). Total 3,192 lines / 175 KB of Dart and 143 KB of `.d.ts` (first-paragraph docs; `--docs none` roughly halves the TS).

**Whole-library run** (`--all-from package:flutter/material.dart --docs none`, which includes everything `widgets.dart` exports): **498 of 604 widget constructors generated, 4,691 of 5,453 parameters emitted (94.6 % of non-`key` parameters), 16,140 lines / 772 KB of Dart, 377 KB of `.d.ts`, 217 decoders, 44 encoders, 120 enums. `flutter analyze`: no issues. `tsc`: no errors.** The 106 skipped constructors: 50 need a builder, 18 need widgets nested in a data class or delegate, 11 need a framework object (`BuildContext`, `RenderObject`), 10 need a callback that returns a value or a `Future`, 1 requires a `Key` (`Dismissible`), the rest abstract delegates, map-keyed shortcuts and typed data. That file is not checked in; the command is in the README.

### Proof

- `flutter analyze` on the package (generated code, support lib, tests): **No issues found**. The generated files carry `// ignore_for_file: type=lint, deprecated_member_use`; the second is only for Flutter 3.50's deprecation of the `material.dart` import. No type errors or warnings are suppressed.
- `tsc -p ts` (strict): **no errors**, over `sample.tsx` (the 16 widgets in one tree, derived and override forms side by side) and `sample-fl-chart.tsx`, including 9 `@ts-expect-error` negatives (unknown enum member, missing required prop, wrong callback payload type, unknown constructor tag, missing field of a constructor variant, unknown prop).
- `flutter test`: **11 tests pass**. Props go through a real JSON round trip, the adapter is pumped, and the real widget is inspected:
  - `Container`: enum, static const, named constructor, unnamed constructor, subclass in a union, abstract `Decoration` → `BoxDecoration` with `Border.all`, `LinearGradient` (colours as constant and as `{value}`), `List<BoxShadow>`; `Text`: text children fill the positional `data`, `TextStyle` decodes.
  - `Switch`: tap → `callFunction(id, 'onChanged', true)`; absent handler → `onChanged == null` (rendered disabled); missing required prop → `Switch: required prop "value" is missing`.
  - `GestureDetector.onPanUpdate`: generated encoder turns `DragUpdateDetails` into `{globalPosition: {dx, dy}, localPosition, sourceTimeStamp: 1500, delta, primaryDelta, kind}` and it survives `jsonEncode`.
  - `Slider`, `AnimatedContainer`: regenerated defaults (`min: 0.0, max: 1.0`), `Duration` as `300` and as `{seconds: 1, milliseconds: 500}`, `Curve` as `"Curves.easeInOut"` and as `{$: "Cubic", a, b, c, d}`.
  - `ListTile` / `AppBar`: slots and `actions` resolve to `FuseNodeWidget`s for the referenced nodes.
  - fl_chart `LineChart`, `PieChart`, `BarChart` and percent_indicator build and paint from JSON.

Limit of the proof: `FuseRuntime` cannot be constructed in a test (private constructor, needs the native QuickJS library), so `FuseNodeWidget` children cannot be pumped. Slot tests therefore inspect the adapter's `build()` result, and nothing was run against the real JS renderer.

### Sample output

Adapter (complete, from `lib/generated/flutter.g.dart`):

```dart
/// Generated adapter for [Container].
class FuseGenContainer extends StatelessWidget {
  const FuseGenContainer(this.node, {super.key});
  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final p = node.props;
    return Container(
      alignment: decAlignmentGeometry(p['alignment']),
      padding: decEdgeInsetsGeometry(p['padding']),
      color: decColor(p['color']),
      isAntiAlias: decBool(p['isAntiAlias']) ?? true,
      decoration: decDecoration(p['decoration']),
      foregroundDecoration: decDecoration(p['foregroundDecoration']),
      width: decDouble(p['width']),
      height: decDouble(p['height']),
      constraints: decBoxConstraints(p['constraints']),
      margin: decEdgeInsetsGeometry(p['margin']),
      transform: decMatrix4(p['transform']),
      transformAlignment: decAlignmentGeometry(p['transformAlignment']),
      child: fuseChild(node),
      clipBehavior: fuseEnum(Clip.values, p['clipBehavior']) ?? Clip.none,
    );
  }
}
```

Required prop, callbacks, handle, prefixed import (from `FuseGenSwitch`, `FuseGenGestureDetector`):

```dart
value: fuseReq(decBool(p['value']), 'Switch', 'value'),
onChanged: p['onChanged'] != true ? null : (a0) => node.callFunction(node.id, 'onChanged', a0),
dragStartBehavior: fuseEnum(gestures.DragStartBehavior.values, p['dragStartBehavior']) ?? gestures.DragStartBehavior.start,
focusNode: node.handle<FocusNode>('focusNode'),
onTap: node.callback('onTap'),
onPanUpdate: p['onPanUpdate'] != true ? null : (a0) => node.callFunction(node.id, 'onPanUpdate', encDragUpdateDetails(a0)),
```

Derived decoder with an override hook in front, and a derived encoder:

```dart
EdgeInsetsGeometry? decEdgeInsetsGeometry(Object? v) {
  if (v == null) return null;
  final nEdgeInsets = niceEdgeInsets(v);          // registry: number -> EdgeInsets.all
  if (nEdgeInsets != null) return nEdgeInsets;
  if (v is String) {
    return switch (v) {
      'zero' => EdgeInsetsGeometry.zero,
      'EdgeInsets.zero' => EdgeInsets.zero,
      ...
    };
  }
  final m = v as Map;
  switch (m[r'$']) {
    case 'all':
      return EdgeInsetsGeometry.all(fuseReq(decDouble(m['value']), 'EdgeInsetsGeometry.all', 'value'));
    case 'only':
      return EdgeInsetsGeometry.only(left: decDouble(m['left']) ?? 0.0, right: decDouble(m['right']) ?? 0.0, top: ..., bottom: ...);
    case 'EdgeInsetsDirectional.only':
      return EdgeInsetsDirectional.only(start: decDouble(m['start']) ?? 0.0, ...);
    ...
  }
  return fuseBad('EdgeInsetsGeometry', v);
}

Map<String, Object?>? encDragUpdateDetails(DragUpdateDetails? v) => v == null
    ? null
    : {
        'globalPosition': encOffset(v.globalPosition),
        'localPosition': encOffset(v.localPosition),
        'sourceTimeStamp': niceEncDuration(v.sourceTimeStamp),
        'delta': encOffset(v.delta),
        'primaryDelta': fuseNum(v.primaryDelta),
        'kind': v.kind?.name,
      };
```

TS (from `ts/generated/flutter.d.ts`):

```ts
/**
 * A convenience widget that combines common painting, positioning, and sizing
 * widgets.
 *
 * Flutter: `Container` (intrinsic `<gen_Container>`)
 */
export interface ContainerProps extends FuseGenBaseProps {
  children?: FuseChildren;
  /** Align the [child] within the container. */
  alignment?: AlignmentGeometry;
  /** The color to paint behind the [child]. */
  color?: Color;
  /** @default true */
  isAntiAlias?: boolean;
  /** The decoration to paint behind the [child]. */
  decoration?: Decoration;
  ...
}
export declare function Container(props: ContainerProps): FuseElement;

export type Clip = "none" | "hardEdge" | "antiAlias" | "antiAliasWithSaveLayer";

export type EdgeInsetsGeometry =
  | number
  | "zero" | "infinity" | "EdgeInsets.zero" | "EdgeInsetsDirectional.zero"
  | { $: "all"; value: number }
  | { $: "only"; left?: number; right?: number; top?: number; bottom?: number }
  | { $: "symmetric"; vertical?: number; horizontal?: number }
  | { $: "fromLTRB"; left: number; top: number; right: number; bottom: number }
  | { $: "EdgeInsetsDirectional.only"; start?: number; top?: number; end?: number; bottom?: number }
  ...;

export type Decoration =
  | { $: "BoxDecoration"; color?: Color | null; image?: DecorationImage | null; border?: BoxBorder | null; borderRadius?: BorderRadiusGeometry | null; boxShadow?: BoxShadow[]; gradient?: Gradient | null; ... }
  | { $: "ShapeDecoration"; color?: Color | null; ...; shape: ShapeBorder }
  | ...;

// GestureDetectorProps
onPanUpdate?: (details: DragUpdateDetailsOut) => void;
export interface DragUpdateDetailsOut {
  globalPosition: OffsetOut;
  localPosition: OffsetOut;
  sourceTimeStamp: number | null;
  delta: OffsetOut;
  primaryDelta: number | null;
  kind: PointerDeviceKind | null;
}
```

Usage that type-checks (`ts/sample.tsx`):

```tsx
<Container padding={16} margin={{ $: "only", left: 4 }} alignment="center" clipBehavior="antiAlias"
  decoration={{ $: "BoxDecoration", color: "white", borderRadius: 12,
    border: { $: "all", color: "#00000022", width: 1 },
    gradient: { $: "LinearGradient", colors: ["#fff", "#eee"], begin: "topLeft", end: "bottomRight" } }}>
  <Text style={{ fontSize: 18, fontWeight: 700, color: "#3366ff", decoration: "underline" }} maxLines={2}>Hello</Text>
  <GestureDetector onPanUpdate={(d) => (dragged += d.delta.dx)} behavior="opaque">…</GestureDetector>
  <AnimatedContainer duration={300} curve="Curves.easeInOut" height={40} />
</Container>
```

### Decisions and hacks, honestly

| topic | what the spike does | status |
|---|---|---|
| **Required vs optional** | Must-supply (required and non-nullable) → required in TS and `fuseReq(...)` in Dart, which throws `Widget: required prop "x" is missing`. | Clean. |
| **Required but nullable** (`ElevatedButton.onPressed`, `Switch.onChanged`) | TS optional, typed `T \| null`; Dart passes `null`. Flutter's "you must think about this" intent is lost. | Decision; could be made required in TS. |
| **Positional params** | Keyed by declared name. For widgets: `Icon(icon)` → `icon` prop. | Clean. |
| **Text content** | General rule: the first parameter is a required positional `String` and the constructor has no child slot → filled from text children when the prop is absent (`<Text>Hello</Text>` and `<Text data="Hello"/>` both work). | Heuristic; also fires on e.g. `Image.network(src)` (harmless there). |
| **Default values** | Dart cannot omit a named argument conditionally, so the adapter must restate the default: `decBool(v) ?? true`. Regenerated from the evaluated constant, so private constants work. TS gets `@default` for literals and enums, `Dart \`…\`` text otherwise. | Works; about 30 failures across all of material, all SDK `external` constructors (`DateTime`) or private const classes (`_DefaultHeroTag`), where the parameter is dropped. |
| **Nullability** | Every decoder returns `T?`; the call site adds `?? default`, `fuseReq`, or nothing. "Prop absent" and "prop null" are the same thing. | Clean; cannot express "explicit null overrides a non-null default". |
| **Deprecated params / ctors / classes** | Skipped (59 widget parameters across material). | Decision. |
| **Named constructors** | For widgets: separate components (`Image.network` → `ImageNetwork`, `CupertinoButton.filled` → `CupertinoButtonFilled`, `ElevatedButton.icon` → `ElevatedButtonIcon`), because the props differ and autocompletion is better. For data classes: a `$` discriminated union. One name collision in all of Flutter (`Positioned.directional` vs `PositionedDirectional`), resolved with a `Ctor` suffix. | Decision. `ListView.builder` is skipped regardless (builder). |
| **Generics** (`DropdownButton<T>`, `Radio<T>`) | Class instantiated to bounds (`DropdownButton<dynamic>`); `T` values cross as raw JSON, typed `unknown` in TS. The TS component is not generic, so `value` and `onChanged`'s argument are not tied together. `DropdownButton.items` (`List<DropdownMenuItem<T>>`, a widget subtype) is dropped, so the generated `DropdownButton` is not actually usable. | Half solved. |
| **Private / unexported / `@protected` types** | A type is usable only if a public entry library exports it; `@protected`, `@visibleForTesting`, `@internal` constructors are ignored. Imports are emitted with prefixes (`gestures.`, `cupertino.`, `ui.`, `<package>.`) for anything `material.dart` does not export, which avoids `dart:ui` name clashes. | Clean. |
| **`children`** | `child` → `fuseChild(node)`; `children` → `node.childWidgets`. Widgets with neither (`Scaffold.body`, `CustomScrollView.slivers`) need a one-line hint; otherwise the slot is a prop. | 2 hints in the registry. |
| **`flex` collision** | solid-fuse's `flex` layout prop collides with `Expanded.flex` / `Flexible.flex` (int). The Flutter parameter wins and the layout prop is not offered on those. | Found by tsc on the whole-library run. Needs a real decision. |
| **`List<Widget>` props** (`actions`, 32 params) | Adapter reads a list of `FuseNode`s. The renderer today only converts a top-level `FuseNode` prop into `{_node}`; arrays need the same. | Needs a small renderer + runtime change; not done (repo files outside the spike were not edited). |
| **`PreferredSizeWidget`** (`Scaffold.appBar`, `AppBar.bottom`) | Wrapped in `PreferredSize` with `kToolbarHeight`, or the slot node's `preferredHeight` prop. | Hack. The real size is not known until the JS child builds. |
| **Callback payloads** | One argument → the value; several → one array (`(args: [a, b]) => void`). `BuildContext` arguments dropped. Non-finite doubles become strings. | Decision; a generated TS wrapper could spread the array. |
| **Const-ness** | Nothing generated is `const`; every rebuild of a node re-decodes all its props. Measured in a JIT test run (upper bound): 0.8 µs for a 2-prop `Container`, 3.9 µs with a 5-class nested decoration, 1.3 µs for `ListTile` with 38 mostly absent params. | Acceptable; a per-prop cache keyed on the raw value's identity would remove it. |
| **`IconData`** | `@mustBeConst` constructor parameters (icon-font tree shaking) mean a decoded `IconData` is rejected by the analyzer, and `Icons` is about 8,900 constants. The registry codec constructs it anyway with an `ignore`, as the existing `FuseIcon` does. | Genuine special case; costs icon tree shaking either way. |
| **Generated size** | 14 to 78 lines of Dart and 0.5 to 11.5 KB of TS per widget; codecs are shared and grow sub-linearly (2,040 lines for 32 widgets, 4,281 for 498). | Fine. `Color`'s alias alone lists 100 constants. |

## Part 3 — pub.dev packages, unassisted

`dart pub add fl_chart percent_indicator` worked through the proxy. The generator was pointed at each with only `--lib <uri>=<prefix> --all-from <uri>`; no code or registry changes.

| | fl_chart 1.3.1 | percent_indicator 4.2.5 |
|---|---|---|
| widget constructors generated | 8 of 8 | 2 of 2 |
| widget params emitted | 30 of 53 (the rest: 13 keys incl. `chartRendererKey`, 10 deprecated) | 57 of 61 (2 keys, 2 sync callbacks) |
| data types derived | 98 (219 constructor variants, 261 constants) | 12 |
| constructor params inside those types | **779 kept, 58 dropped (93.1 %)** | 125 kept, 0 dropped |
| generated Dart / `.d.ts` | 1,751 lines / 52 KB | 554 lines / 19 KB |
| `flutter analyze` / `tsc` | clean / clean | clean / clean |
| renders in a widget test | `LineChart`, `PieChart`, `BarChart` | `CircularPercentIndicator` |

`LineChartData` came out as a fully typed deep object: `lineBarsData[].spots[]` as `{x, y}` or `"nullSpot"`, `belowBarData.gradient` as the shared `Gradient` union, `borderData.border` as the shared `Border` type, `titlesData.leftTitles.sideTitles.reservedSize`, and so on. A test builds a chart with grid, border, titles, a curved gradient line and area fill from JSON and asserts the resulting `LineChartData` field by field.

What broke, all in the same category:

- **39 value-returning callbacks inside the config** are dropped: `FlGridData.getDrawingHorizontalLine`, `checkToShowHorizontalLine`, `FlDotData.getDotPainter`, `LineTouchTooltipData.getTooltipItems`, `RadarChartData.getTitle`, etc. Their defaults apply, so charts render, but per-point styling and tooltip content cannot be customised.
- **`SideTitles.getTitlesWidget`** (a builder) is dropped, so axis labels are always fl_chart's default numbers. This is the first thing a real user would hit.
- **7 `touchCallback`s** (void, encodable) and 2 widget fields (`AxisTitles.axisNameWidget`, `PieChartSectionData.badgeWidget`) are dropped only because functions and node refs cannot yet be nested inside a prop object.
- 8 parameters of type `ui.Image` / `SizedPicture`; `FlTransformationConfig.transformationController` (a handle nested in data).
- The union for `FlSpot` picked up its subclasses `CandlestickSpot` and `LineBarSpot` as arms: correct by the rule, noise in practice.

So: declarative chart configuration works with no assistance; anything the package expresses as "give me a function" does not.

## Limits

1. **Synchronous Dart → JS calls are the wall.** Builders (147 params, 58 distinct signatures; 39 of the 147 have fully encodable arguments), value-returning callbacks (125) and `Future`-returning ones (16) are 3.9 % of parameters, but a builder alone is required by 50 of 604 widget constructors, and they are where pub packages put their customisation points. Types cannot fix this. It needs a bridge decision: a synchronous call into QuickJS during build, or a declarative replacement per pattern (item templates for `IndexedWidgetBuilder`, a state map for `WidgetStateProperty.resolveWith`, format strings for label callbacks).
2. **Nested widgets, callbacks and handles in data classes** need the wire to carry `{_node}` and function markers at nested paths (and `_functionCall` to address them). The survey says this adds only 0.3 % of widget parameters, but it is what unlocks `BottomNavigationBar.items`, `InputDecoration`'s 15 widget fields, `DataTable`, `Stepper` and fl_chart's touch callbacks.
3. **"Covered" is optimistic in three ways.** Recursive types are assumed bridgeable while being analysed. A data type counts when its required constructor parameters are bridgeable, with optional ones silently dropped (5.1 % of data params are of such types). And about 80 parameters (1 %) are service objects that are constructible but not really data (`ScrollBehavior`, `TextSelectionControls`, `NavigatorObserver`, `AssetBundle`, `ThemeData`). A few `Listenable` types that are really "subclass me" (`CustomPainter`, `CustomClipper`: 7 params) are counted as handles.
4. **Derived unions are complete, not curated.** `Color` offers `MaterialColor` and three `CupertinoDynamicColor` constructors; `EdgeInsetsGeometry` offers both `fromLTRB` and `EdgeInsets.fromLTRB`; abstract types force a tag (`{$: "BoxDecoration"}`). Correct, type-safe and autocompletable, but noisier than a hand-designed input. Constant labels differ by declared type (`"center"` for an `Alignment` parameter, also `"Alignment.center"` for `AlignmentGeometry`).
5. **`WidgetStateProperty<T>`** (107 params, all of Material's stateful styling) derives only the constant-value arm. Per-state values need the hand-written map codec.
6. **Handles are only half generated.** The adapter emits `node.handle<ScrollController>('controller')`, but the handle type itself (its factory, methods, events) is still hand-written per controller class. Deriving handle classes from controller APIs is the same exercise as this spike for methods instead of constructors, and was not attempted.
7. **Implicit animations and state**: adapters are stateless and rebuild from props. That is right for almost everything surveyed, but nothing here addresses widgets that need a `TickerProvider`, or `Key` semantics for list reordering (keys are dropped).
8. **Not validated against the running system**: no JS renderer in the loop, no hot reload, no measurement of bundle or binary size impact (registering 500 adapters defeats widget tree shaking; generation should be driven by what the app imports).
9. **Analyzer API churn**: the spike uses analyzer 14.7's element model plus two `src/`-level accessors (`Namespace.definedNames2`, `get2`). Pinning analyzer and running generation at build time, not in the consumer's app, keeps that contained.

## How to run

```bash
cd experiments/interop/gen
./run.sh                      # survey + all generation + flutter analyze + tsc + flutter test (about 2 minutes)
```

Individual commands, flags and the file layout are in `gen/README.md`. Outputs: `gen/out/survey.md` (full survey tables, including the complete lists of builders, callbacks, handles and unbridgeable types), `gen/out/*.report.json` (per-widget generator reports), `gen/lib/generated/`, `gen/ts/generated/`.
