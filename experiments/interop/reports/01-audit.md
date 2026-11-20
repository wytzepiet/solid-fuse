# 01 — Ground-truth audit of the hand-written widget/handle surface

Scope: `main` (`/home/claude/solid-fuse`, HEAD ffaab73) and the unmerged `slivers` branch (`/home/claude/wt/slivers`, HEAD 7bfefbe).
Path shorthands: `D/` = `packages/solid-fuse/dart/lib/src/`, `T/` = `packages/solid-fuse/src/`. **[S]** = exists only on the slivers branch (line numbers are from that worktree). Everything else has identical line numbers on both (the nine main widget files other than `text.dart` are byte-identical on the two branches).

How this was produced: every Dart builder/handle and every TS wrapper was read in full; prop name sets were also cross-checked mechanically (regex extraction of `node.<accessor>('key')` reads vs `*Props` interface members). Flutter constructor parameter lists come from the local SDK (`/opt/flutter`, Flutter 3.50.1) via a regex extraction, so "Flutter has N params" figures are approximate to within one or two. The PR 1 scanner was re-run from a scratch copy against both trees (nothing in the worktrees was modified).

---

## 0. Headline numbers

| | main | slivers branch (cumulative) |
|---|---|---|
| Widgets (registered tags) | 9 | 47 |
| Handles (registered) | 3 | 4 |
| Public TS widget props (own members of `*Props`, excl. inherited `children`/`ref`) | 186 | 374 |
| Dart widget LOC / TS widget LOC | 1057 / 440 | 2762 / 1179 |
| Dart handle LOC / TS handles+types LOC | 90 / 174 | 156 / 224 |

Prop classification (primary category per prop, definitions in section 1):

| Cat | Meaning | main (186) | added on slivers (188) | all (374) |
|---|---|---|---|---|
| a | 1:1 Flutter ctor param, primitive | 36 (19.4%) | 78 (41.5%) | 114 (30.5%) |
| b | 1:1, string union to Dart enum | 21 (11.3%) | 18 (9.6%) | 39 (10.4%) |
| c | 1:1, value type needing a codec | 14 (7.5%) | 28 (14.9%) | 42 (11.2%) |
| d | callback | 58 (31.2%) | 9 (4.8%) | 67 (17.9%) |
| e | widget slot prop | 2 (1.1%) | 17 (9.0%) | 19 (5.1%) |
| f | handle/controller ref | 2 (1.1%) | 4 (2.1%) | 6 (1.6%) |
| g | invented API, no 1:1 Flutter param | 53 (28.5%) | 31 (16.5%) | 84 (22.5%) |
| h | builder-style, bridged by hand | 0 | 3 (1.6%) | 3 (0.8%) |

Derived answers to the key question:

- **Mechanical projection of a Flutter constructor (a–f): 287 / 374 = 76.7%** (main 71.5%, slivers-added 81.9%).
- **Hand-designed (g+h): 87 / 374 = 23.3%.**
- Within the mechanical 287: **191 (51.1% of all) need no decision at all** (a, b, f, and callbacks with no or primitive payload); **96 (25.7%) are mechanical only once a per-type codec exists** (42 value types, 35 struct-payload callbacks, 19 slots).
- Within the hand-designed 87: **42 are "flatten a nested Flutter value object onto the widget"** (36 TextStyle fields on Text/TextField/TextSpan, 6 grid-delegate fields) which a single `flatten` rule could express, lifting the rule-expressible share to **329 / 374 = 88.0%**. The **truly un-inventable residue is 45 props (12.0%)**: View (20), `flex` (4), TextField's value/placeholder/hintText/spellCheck/allowPattern/denyPattern (6), Image src/type/borderRadius (3), extent/prototype synthesis (5), ctor-variant selectors (2), `bottomHeight` (2), builder props (3).
- The residue is concentrated: **View + TextField + Text-style flattening account for 63 of 84 g-props**; 28 of 47 widgets are thin (pure projection), 12 medium, 7 thick (section 2.3).
- Reverse coverage: on the 23 widgets that wrap exactly one Flutter widget, **279 of ~400 Flutter ctor params are exposed (70%)**; ~121 are silently absent (section 2.4).

---

## 1. Per-widget and per-handle prop tables

Category legend: **a** primitive pass-through; **b** enum; **c** value type with parse (codec); **d** callback; **e** widget slot; **f** handle ref; **g** invented; **h** builder bridged by hand. "lossy" on a c-row means the TS shape cannot express the full Dart type. Children handling is listed under each table (it is not a counted prop).

### 1.1 Shared codecs (the value types that cross JS to Dart)

All decoded from `FuseMap` accessors (`D/node.dart:28-65`) backed by `D/utils.dart`.

| Dart type | Accessor | TS input type (`T/types.ts`) | Wire shape(s) | TS richer/friendlier than Dart? | Lossy? |
|---|---|---|---|---|---|
| `double` / `int` | `double`/`int` (`node.dart:28-31`) | `number` | number | — | — |
| `bool` | `bool` (`:32`) | `boolean` | bool (hard `as bool?` cast; throws on non-bool) | — | — |
| `String` | `string` (`:33`) | `string` | string (hard cast) | — | — |
| `List<T>` | `list<T>` (`:34`) | `T[]` | array | — | — |
| `Color` | `color` → `parseColor` (`utils.dart:34-80`) | `ColorInput` (`types.ts:9-13`) | 16 named strings; `#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA` (CSS alpha-last); `{r,g,b,a?}`; `{h,s,l,a?}` | Yes, much richer than `Color(0xAARRGGBB)` | No `Colors.x.shadeN`, no theme colors; unknown string → `null` silently |
| `EdgeInsets` | `edgeInsets` → `parseEdgeInsets` (`:89-108`) | `EdgeInsetsInput` (`:15-23`) | number (= all) or `{all,top,bottom,left,right,horizontal,vertical}` with precedence side > axis > all | Yes | No directional (`start/end`) |
| `BorderRadius` | `borderRadius` (`:116-134`) | `BorderRadiusInput` (`:25-31`) | number or `{all,topLeft,…}` | Yes | circular only, no elliptical |
| `Border` | `border` (`:155-179`) | `BorderInput` (`:33-44`) | `{width,color}` or `{all,top,bottom,left,right}` of sides | Yes | no `style`, no `strokeAlign` |
| `List<BoxShadow>` | `boxShadows` (`:184-210`) | `ShadowInput \| ShadowInput[]` (`:46-52`) | `{color,blurRadius,spreadRadius,offsetX,offsetY}` | single-or-array | default color `0x40000000` (Flutter: opaque black) |
| `List<Shadow>` (text) | private `_parseShadows` (`D/widgets/text.dart:123-139`) | same `ShadowInput` | same minus `spreadRadius` | — | second parser for the same TS type |
| `Gradient` | `gradient` (`:216-243`) | `GradientInput` (`:64-72`) | `{type:'linear'\|'radial',colors,stops,begin,end,center,radius}` | — | no sweep, no tileMode/transform; default begin/end `topCenter→bottomCenter` (Flutter: `centerLeft→centerRight`) |
| `DecorationImage` | `decorationImage` (`:248-258`) | `ImageInput` (`:74-77`) | `{url,fit}` | — | network only; fit default `cover` (Flutter: null) |
| `BoxDecoration` | `boxDecoration` (`:264-298`) | `DecorationInput` (`:79-88`) | `{color,borderRadius,border,shadow,gradient,image,shape,blendMode}` | renames `boxShadow→shadow`, `backgroundBlendMode→blendMode` | `blendMode` typed `string` |
| `Offset` | `offset` (`node.dart:52-59`) | `{x:number;y:number}` | `{x,y}` | — | other Offsets use different encodings: `offsetX/offsetY` (shadows), `translateX/translateY` (transform) |
| `Alignment` | `alignment` (`utils.dart:302-318`) | `AlignmentString` (`:59-62`) | one of 9 names | — | no arbitrary `Alignment(x,y)`, no directional |
| `BlendMode` | `blendMode` (`:341-360`) | `string` (untyped) | 15 of Flutter's 29 names | — | `srcIn`, `srcOver`, `clear`, … unreachable; unknown → null |
| `Clip` | `clipBehavior` (`:364-372`) | inline `"none"\|"hardEdge"\|"antiAlias"` (retyped in 5 files) | string | — | TS omits `antiAliasWithSaveLayer` that Dart accepts; absent → `Clip.none` |
| `FontWeight` | `fontWeight` (`:376-395`) | `FontWeight` (`:54-57`) | 100..900 or 9 names | Yes (names) | — |
| `BoxFit` [S] | `boxFit` (`utils.dart:316-327` [S]) | `BoxFit` (`types.ts:74-75` [S]) | string | — | absent → `cover` |
| `ImageRepeat` [S] | `imageRepeat` (`utils.dart:331-338` [S]) | `ImageRepeat` | string | — | — |
| `Curve` [S] | `curve` (`utils.dart:376-393` [S]) | local `CurveName` (not exported) or `string` | 14 names | — | no `Cubic`, unknown → `linear` silently |
| `Duration` | inline `Duration(milliseconds: int)` (`D/handles/scroll_controller.dart:27`, [S] `sliver_animated_opacity.dart:17`, `sliver_floating_header.dart:24`, `tab_controller.dart:49`) | `number` (ms) | number | Yes | ms resolution |
| `Locale` | `_parseLocale` (`D/widgets/text.dart:85-92`) | `string` | `"en"` / `"en-US"` | Yes | no script code |
| `Radius` | `_cursorRadius` (`D/widgets/text_field.dart:246`) | `number` | number | Yes | circular only |
| `IconData` | inline (`D/widgets/icon.dart:12-23`) | `IconData` (`T/widgets/icon.tsx:8-14`) | `{codePoint,fontFamily?,fontPackage?,matchTextDirection?,fontFamilyFallback?}` | 1:1 with the Dart ctor | — |
| `TextInputType` | `_keyboardType` (`text_field.dart:191-200`) | `KeyboardType` | 6 names | — | `number` hard-wired to `numberWithOptions(decimal:true)` |
| `ScrollPhysics` | inline switch, 3 copies (`scroll_view.dart:20-27`; [S] `custom_scroll_view.dart:21-28`, `tab_bar_view.dart:19-26`) | inline union, retyped 3× | 5 names | — | no parent chaining, no custom physics |
| `InputBorder` | `_inputBorder` (`text_field.dart:173-180`) | `TextFieldBorderStyle` | 3 names | — | no color/width/radius |
| `SystemUiOverlayStyle` [S] | inline (`sliver_app_bar.dart:31-35`) | `"light"\|"dark"` | string | — | two presets only |
| `Set<PointerDeviceKind>` | inline (`gesture_detector.dart:148-158`) | `PointerDevice[]` | string[] | — | 4 of 6 kinds (no `invertedStylus`, `unknown`); unrecognised string → `touch` |
| `AnimationStyle` [S] | inline (`sliver_floating_header.dart:20-28`) | `{duration?,curve?}` | object | — | no reverse fields |
| `TextScaler` [S] | inline (`text.dart:87`) | `number` | number | Yes | linear only |
| `ScrollCacheExtent` [S] | inline (`custom_scroll_view.dart:71-72`) | `number` | number | — | pixels only |
| `Axis`, `TextDirection`, `Brightness`, `HitTestBehavior`, `DragStartBehavior`, … | inline `switch` per use site | inline unions per use site | string | — | see drift, section 3 |

Roughly 30 Dart types cross the wire inbound today. Only the first ~20 have a shared accessor; the rest are re-implemented inline per widget.

### 1.2 `view` → composition (thick) — `D/widgets/view.dart`, `T/widgets/view.tsx:10-31`

No Flutter `View` widget exists. Up to 13 nested widgets are built inside-out (`view.dart:49-176`): Flex → Padding → Align → ClipRRect/ClipRect → DecoratedBox → DecoratedBox(foreground) → AspectRatio → SizedBox → ConstrainedBox → Opacity → Transform ×3 → Padding(margin) → IgnorePointer → Visibility → Flexible. All 20 props are category **g**; the "nearest Flutter param" column shows what a `Container`-based projection could have covered.

| Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|
| flex | `FlexInput` | `node.flexChildren` (`node.dart:108-155`) | `Flex(direction, mainAxisSize, mainAxisAlignment, crossAxisAlignment, spacing)`; collapses to the bare child when 1 child and defaults | g |
| padding | `EdgeInsetsInput` | `edgeInsets` `:15` | `Padding.padding` (`Container.padding`) | g |
| margin | `EdgeInsetsInput` | `:16` | outer `Padding.padding` (`Container.margin`) | g |
| width, height | `number` | `:19-20` | `SizedBox.width/height` | g |
| minWidth, maxWidth, minHeight, maxHeight | `number` | `:21-24` | `ConstrainedBox(BoxConstraints(...))` (`Container.constraints`) | g |
| aspectRatio | `number` | `:25` | `AspectRatio.aspectRatio` | g |
| alignment | `AlignmentString` | `:28` | `Align.alignment` | g |
| decoration | `DecorationInput` | `boxDecoration` `:31` | `DecoratedBox.decoration`; its `borderRadius` is also reused for `ClipRRect` (`:69-75`) | g |
| foregroundDecoration | `DecorationInput` | `:32` | `DecoratedBox(position: foreground)` | g |
| grow | `number` | `int` `:35` | `Flexible.flex` (renamed) | g |
| fit | `"tight"\|"loose"` | `string` `:36`, `:174` | `Flexible.fit` (`FlexFit`), only when `grow > 0` | g |
| transform | `TransformInput` `{rotate,scale,translateX,translateY}` | `map` `:39`, `:133-151` | `Transform.rotate` / `.scale` / `.translate`, fixed order | g |
| clipBehavior | `"none"\|"hardEdge"\|"antiAlias"` | `string` `:42`, `clipBehavior` `:68` | selects `ClipRRect` vs `ClipRect` | g |
| opacity | `number` | `:45`, clamped `:128` | `Opacity.opacity` | g |
| visible | `boolean` | `:46` | `Visibility(visible:false)` only when false | g |
| ignorePointer | `boolean` | `:47` | presence of `IgnorePointer` | g |

Children: `flexChildren`.

### 1.3 `text` → `Text` / `Text.rich` — `D/widgets/text.dart`, `T/widgets/text.tsx`

Main: stateless `Text` (`text.dart:6-61`). [S]: `FuseText` delegates to stateful `FuseRichText` when any child is not a text node (`text.dart:19-20` [S]); TextStyle building moved to top-level `buildTextStyle` (`:204-220` [S]).

| Prop | TS type | Dart decode (main line / [S] line) | Feeds (Dart type) | Cat |
|---|---|---|---|---|
| textAlign | 6-value union | `_parseTextAlign(node.string)` `:23` / `:24` | `Text.textAlign` (`TextAlign?`) | b |
| maxLines | `number` | `int` `:24` / `:26` | `Text.maxLines` (`int?`) | a |
| overflow | 4-value union | `:25` / `:27` | `Text.overflow` (`TextOverflow?`) | b |
| textDirection | `"ltr"\|"rtl"` | `:33` / `:25` | `Text.textDirection` | b |
| softWrap | `boolean` | `node.props['softWrap'] as bool?` `:26` / `:28` (rich path uses `node.bool`, `:85`) | `Text.softWrap` | a |
| locale | `string` | `_parseLocale` `:32` / `:29` | `Text.locale` (`Locale?`) | c |
| textScaler [S] | `number` | `double` `:75`, **rich path only** | `Text.rich(textScaler: TextScaler.linear)` | c |
| fontSize | `number` | `:13` / `:207` | `TextStyle.fontSize` | g (flatten) |
| fontWeight | `FontWeight` | `:15` / `:208` | `TextStyle.fontWeight` | g (flatten) |
| fontFamily | `string` | `:14` / `:206` | `TextStyle.fontFamily` | g (flatten) |
| fontStyle | `"normal"\|"italic"` | `== 'italic'` `:16` / `:209` | `TextStyle.fontStyle` (`normal` → null) | g (flatten) |
| color | `ColorInput` | `:19` / `:210` | `TextStyle.color` | g (flatten) |
| lineHeight | `number` | `:20` / `:211` | `TextStyle.height` (renamed) | g (flatten) |
| letterSpacing, wordSpacing | `number` | `:21-22` / `:212-213` | same-named TextStyle fields | g (flatten) |
| textDecoration | 4-value union | `:27` / `:214` | `TextStyle.decoration` (renamed; no combine) | g (flatten) |
| textDecorationColor | `ColorInput` | `:28` / `:215` | `TextStyle.decorationColor` (renamed) | g (flatten) |
| textDecorationStyle | 5-value union | `:29` / `:216` | `TextStyle.decorationStyle` (renamed) | g (flatten) |
| backgroundColor | `ColorInput` | `:30` / `:217` | `TextStyle.backgroundColor` | g (flatten) |
| shadows | `ShadowInput \| ShadowInput[]` | `_parseShadows(node.props['shadows'])` `:31` / `:218` | `TextStyle.shadows` | g (flatten) |

Children: all descendant `__text__` nodes concatenated into the positional `data` string (`_extractText`, `:141-151`). [S] rich path: `__text__` → `TextSpan(text)`, `<textSpan>` → `TextSpan`, anything else → `WidgetSpan(child: FuseNodeWidget)` whose alignment is read from the **child's** `alignment` prop (`:119` [S]).

### 1.4 `textSpan` [S] → `TextSpan` (marker node) — `D/widgets/text.dart:128-170,187-200`, `T/widgets/text.tsx:56-68`

| Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|
| 13 `TextStyleProps` (same list as 1.3) | same | `buildTextStyle(node)` `:136` | `TextSpan.style` | g (flatten) ×13 |
| onTap | `() => void` | `node.callback('onTap')` `:130` | `TextSpan.recognizer = TapGestureRecognizer()..onTap`; recognizers tracked and disposed by `_FuseRichTextState` (`:53-73`) | d (no payload; non-trivial lifecycle) |

Children: string and nested spans, interpreted by the parent `<text>`; a standalone `<textSpan>` asserts (`:194-197`).

### 1.5 `icon` → `Icon` (thin) — `D/widgets/icon.dart`, `T/widgets/icon.tsx:16-31`

| Prop | TS type | Dart decode | Feeds (Dart type) | Cat |
|---|---|---|---|---|
| data (required in TS) | `IconData` | `map` `:12`, fields `:13-22` | positional `icon` (`IconData`) | c |
| color | `ColorInput` | `:24` | `Icon.color` | c |
| size, fill, weight, grade, opticalSize | `number` | `double` `:25,27-30` | same names (`double?`) | a ×5 |
| semanticLabel | `string` | `:26` | `Icon.semanticLabel` | a |
| fontWeight | `FontWeight` | `:31` | `Icon.fontWeight` | c |
| applyTextScaling | `boolean` | `:32` | `Icon.applyTextScaling` | a |
| shadows | `ShadowInput \| ShadowInput[]` | `node.boxShadows('shadows')?.cast<Shadow>()` `:33` | `Icon.shadows` (`List<Shadow>?`) | c |
| blendMode | `string` | `:34` | `Icon.blendMode` | b |

Not exposed: `textDirection`. Children: none.

### 1.6 `gestureDetector` → `GestureDetector` (thin, large) — `D/widgets/gesture_detector.dart`, `T/widgets/gesture-detector.tsx:89-162`

| Prop(s) | TS type | Dart decode | Flutter signature → payload sent | Cat |
|---|---|---|---|---|
| flex | `FlexInput` | `flexChildren` `:236` | (child wrapper) | g |
| onTap, onTapCancel, onSecondaryTap, onSecondaryTapCancel, onTertiaryTapCancel, onDoubleTap, onDoubleTapCancel, on{,Secondary,Tertiary}LongPress{,Cancel,Up}, on{Vertical,Horizontal}DragCancel, onPanCancel (19) | `() => void` | `node.callback(...)` directly `:168-224` | `GestureXCallback = void Function()` → no payload | d ×19 |
| onTapDown, onSecondaryTapDown, onTertiaryTapDown, onDoubleTapDown (4) | `(d: TapDownDetails) => void` | `_tapDown(name)` `:21-25` | `TapDownDetails` → `{x,y,localX,localY,kind?}` | d ×4 |
| onTapUp, onSecondaryTapUp, onTertiaryTapUp (3) | `(d: TapUpDetails)` | `_tapUp` `:27-31` | `TapUpDetails` → `{x,y,localX,localY,kind}` | d ×3 |
| on{,Secondary,Tertiary}LongPressDown (3) | `LongPressDownDetails` | `_longPressDown` `:34-38` | → `{x,y,localX,localY,kind?}` | d ×3 |
| …LongPressStart (3) | `LongPressStartDetails` | `:41-45` | → `{x,y,localX,localY}` | d ×3 |
| …LongPressMoveUpdate (3) | `LongPressMoveUpdateDetails` | `:48-55` | → `{x,y,localX,localY,offsetX,offsetY}` (drops `localOffsetFromOrigin`) | d ×3 |
| …LongPressEnd (3) | `LongPressEndDetails` | `:58-62` | → `{x,y,localX,localY,vx,vy}` | d ×3 |
| on{Vertical,Horizontal}DragDown, onPanDown (3) | `DragDownDetails` | `:65-69` | → `{x,y,localX,localY}` | d ×3 |
| …DragStart, onPanStart (3) | `DragStartDetails` | `:72-76` | → `{x,y,localX,localY,kind?}` (drops `sourceTimeStamp`) | d ×3 |
| …DragUpdate, onPanUpdate (3) | `DragUpdateDetails` | `:79-87` | → `{x,y,localX,localY,dx,dy,primaryDelta?}` | d ×3 |
| …DragEnd, onPanEnd (3) | `DragEndDetails` | `:90-98` | → `{x,y,localX,localY,vx,vy,primaryVelocity?}` | d ×3 |
| onScaleStart | `ScaleStartDetails` | `:101-108` | → `{x,y,localX,localY,pointerCount,kind?}` | d |
| onScaleUpdate | `ScaleUpdateDetails` | `:111-121` | → `{x,y,localX,localY,scale,horizontalScale,verticalScale,rotation,pointerCount,dx,dy}` | d |
| onScaleEnd | `ScaleEndDetails` | `:124-128` | → `{vx,vy,scaleVelocity,pointerCount}` | d |
| behavior | 3-value union | `:132-139` | `behavior` (`HitTestBehavior?`), absent → null | b |
| dragStartBehavior | `"start"\|"down"` | `:141-146` | `DragStartBehavior` | b |
| supportedDevices | `PointerDevice[]` | `:148-158` | `Set<PointerDeviceKind>?` | b |
| excludeFromSemantics, trackpadScrollCausesScale | `boolean` | `:231,233` | same | a ×2 |
| trackpadScrollToScaleFactor | `{x,y}` | `node.offset` `:234` | `Offset` | c |

Payload convention is invented: `Offset globalPosition` → flat `x,y`; `localPosition` → `localX,localY`; `Velocity` → `vx,vy`; `delta` → `dx,dy`; enums → `.name`. 13 Details classes are serialized by 13 hand-written wrappers. Not exposed: `onTapMove`, `onForcePress{Start,Peak,Update,End}`. Children: `flexChildren`.

### 1.7 `positioned` → `Positioned` (thin) — `D/widgets/positioned.dart`, `T/widgets/positioned.tsx:3-11`

| Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|
| top, left, right, bottom, width, height | `number` | `double` `:13-18` | same names (`double?`) | a ×6 |
| flex | `FlexInput` | `flexChildren` `:19` | child wrapper | g |

### 1.8 `scrollView` → `SingleChildScrollView` (thin) — `D/widgets/scroll_view.dart`, `T/widgets/scroll-view.tsx:3-16`

| Prop | TS type | Dart decode | Feeds (Dart type) | Cat |
|---|---|---|---|---|
| scrollDirection | `"vertical"\|"horizontal"` | `:13`, falls back to `flex.direction` `:14,29-31` | `scrollDirection` (`Axis`) | b |
| flex | `FlexInput` | `:14`, `flexChildren` `:67` | child wrapper | g |
| padding | `EdgeInsetsInput` | `:61` | `padding` (`EdgeInsetsGeometry?`) | c |
| physics | 5-value union | `:20-27` | `physics` (`ScrollPhysics?`) | c (lossy) |
| reverse | `boolean` | `:16` | `reverse` | a |
| primary | `boolean` | `node.props['primary'] as bool?` `:17` | `primary` (`bool?`) | a |
| clipBehavior | 3-value union | `:33-34` (absent → `hardEdge`) | `clipBehavior` (`Clip`) | b |
| keyboardDismissBehavior | `"manual"\|"onDrag"` | `:36-39` | enum | b |
| dragStartBehavior | `"start"\|"down"` | `:41-44` | enum | b |
| hitTestBehavior | 3-value union | `:46-51` (absent → `opaque`) | enum | b |
| restorationId | `string` | `:18` | `restorationId` | a |
| controller | `ScrollController` handle | `node.handle<ScrollController>('controller')` `:53` | `controller` | f |

All 11 non-key Flutter params are exposed. Children: `flexChildren`.

### 1.9 `stack` → `Stack` (thin) — `D/widgets/stack.dart`, `T/widgets/stack.tsx:3-8`

| Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|
| alignment | `AlignmentString` | `:12` (default `topLeft`) | `alignment` (`AlignmentGeometry`) | c |
| textDirection | `"ltr"\|"rtl"` | `:21-25` | `TextDirection?` | b |
| fit | 3-value union | `:13-18` | `StackFit` | b |
| clipBehavior | 3-value union | `node.clipBehavior` `:19` (absent → `Clip.none`; Flutter default is `hardEdge`) | `Clip` | b |

Children: `node.childWidgets` → `children` (`:32`).

### 1.10 `textField` → `TextField` (thick, stateful) — `D/widgets/text_field.dart`, `T/widgets/text-field.tsx:52-121`

`_FuseTextFieldState` owns a `TextEditingController` and reconciles the JS-controlled `value` against user edits (`:16-38`).

| Prop | TS type | Dart decode | Feeds (Dart type) | Cat |
|---|---|---|---|---|
| value | `string` | `:22`, `:30-37` | internal `TextEditingController` (text + collapsed selection) | g |
| focusNode | `FocusNode` handle | `node.handle<FocusNode>` `:50` | `focusNode` | f |
| placeholder | `string` | `:139` (fallback) | `InputDecoration.hintText` | g (alias) |
| hintText | `string` | `:139` | `InputDecoration.hintText` (hoisted) | g |
| obscureText, readOnly, autofocus, enabled, autocorrect, enableSuggestions, enableIMEPersonalizedLearning, expands, showCursor | `boolean` | `:58-64,70-71,80,83` | same names | a ×9 |
| obscuringCharacter | `string` | `:62` | same | a |
| maxLines, minLines, maxLength | `number` | `int` `:77-79` | same | a ×3 |
| cursorWidth, cursorHeight | `number` | `:85-86` | same | a ×2 |
| autofillHints | `string[]` | `list<String>` `:73` | `Iterable<String>?` | a |
| spellCheck | `boolean` | `:65-67` | `spellCheckConfiguration: SpellCheckConfiguration(DefaultSpellCheckService)` | g |
| smartDashesType, smartQuotesType | `"disabled"\|"enabled"` | `:68-69`, `:249-263` | enums | b ×2 |
| textCapitalization | 4-value union | `:72`, `:182-189` | enum | b |
| keyboardAppearance | `"light"\|"dark"` | `:74`, `:265-271` | `Brightness?` | b |
| textInputAction | 6-value union | `:76`, `:202-212` | enum (6 of 13 values) | b |
| textAlign | 6-value union | `:81`, `:214-223` (absent → `left`) | `TextAlign` | b |
| keyboardType | `KeyboardType` | `:75`, `:191-200` | `TextInputType` | c (lossy) |
| cursorColor | `ColorInput` | `:84` | `Color?` | c |
| cursorRadius | `number` | `:87`, `:246` | `Radius?` | c |
| scrollPadding | `EdgeInsetsInput` | `:88` | `EdgeInsets` | c |
| decoration | `TextFieldDecoration` (12 keys + `hintStyle` with 4) | `_buildDecoration` `:137-171` | `InputDecoration` (18 of 58 fields; `border` string fans out to `border`/`enabledBorder`/`focusedBorder`) | c (lossy) |
| allowPattern, denyPattern | `string` | `_buildFormatters` `:102-120` | `inputFormatters: [FilteringTextInputFormatter.allow/deny(RegExp)]` | g ×2 |
| fontSize, fontWeight, fontFamily, fontStyle, color, letterSpacing, height, textDecoration, textDecorationColor, textDecorationStyle | as Text | `_textStyle` `:122-135` | `style: TextStyle(...)` | g (flatten) ×10 |
| flex | `FlexInput` | **never read** | — | g (dead) |
| prefixIcon, suffixIcon | `JSX.Element` | `node.widget` `:168-169` | `InputDecoration.prefixIcon/suffixIcon` (hoisted to top level) | e ×2 |
| onChanged, onSubmitted | `(text: string) => void` | `node.callback` passed directly `:91-92` | `ValueChanged<String>` → raw string | d ×2 |
| onEditingComplete, onTap | `() => void` | `:93-94` | `VoidCallback` / `GestureTapCallback` | d ×2 |
| onTapOutside | `() => void` | `:95` | `TapRegionCallback(PointerDownEvent)` → event dropped | d |

Exposed: ~37 of 71 `TextField` params. Children: none.

### 1.11 `navigator` → `Navigator` (thick) — `D/widgets/navigator.dart`, `T/navigator.tsx`, `T/navigation-controller.ts` (210 lines, JS-only state)

| Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|
| controller (public) | `NavigationController` | none (JS only, `navigator.tsx:31-35`) | — | g |
| initialPage (public) | `(() => JSX.Element) \| PageConfig` | none | — | g |
| onDidRemovePage (wire-private) | `(e:{id:number})=>void` | `node.callback` `:39` | `Navigator.onDidRemovePage(Page)` → `{id: ValueKey.value}` | d |
| `_pageId` (wire-private, on each page child) | `number` | `node.int('_pageId')` (`D/fuse_page_handle.dart:22`) | `Page.key = ValueKey(id)` | g |

Children: each child must be a node whose `ownHandle` is a `FusePageHandle`; their `object`s form `Navigator.pages` (`:23-33`). Not counted in the 374.

### 1.12 `image` [S] → `Image` (medium) — `D/widgets/image.dart`, `T/widgets/image.tsx:10-40`

| Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|
| src (required) | `string` | `:16`, `_resolveProvider` `:63-79` | `image: Memory/Network/File/AssetImage` chosen by prefix sniffing | g |
| type | `"network"\|"asset"\|"file"\|"memory"` | `:19` | overrides provider choice | g |
| borderRadius | `BorderRadiusInput` | `:48-51` | wraps in `ClipRRect` | g |
| width, height | `number` | `:28-29` | same | a ×2 |
| semanticLabel | `string` | `:36` | same | a |
| fit | `BoxFit` | `node.boxFit` `:30` (absent → `cover`; Flutter: null) | `BoxFit?` | b |
| repeat | `ImageRepeat` | `:32` | `ImageRepeat` | b |
| colorBlendMode | `string` | `:34-35` (defaults `srcIn` when color set) | `BlendMode?` | b |
| alignment | `AlignmentString` | `:31` | `AlignmentGeometry` | c |
| color | `ColorInput` | `:22` | `Color?` | c |
| placeholder | `any` | `node.widget` `:23`, `:42-45` | `loadingBuilder` returning the static slot while `progress != null`, network only | e (builder flattened to a slot) |
| errorWidget | `any` | `:24`, `:37-39` | `errorBuilder` returning the static slot | e (builder flattened) |

### 1.13 Tabs [S] — `D/widgets/tabs/*.dart`, `T/widgets/tabs/*.tsx`

| Widget → Flutter | Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|---|
| `defaultTabController` → `DefaultTabController` | length (required) | `number` | `default_tab_controller.dart:20` | `length` | a |
| | initialIndex | `number` | `:21` | `initialIndex` | a |
| `tab` → `Tab` | text | `string` | `tab.dart:17,31` | `text` | a |
| | height | `number` | `:18` | `height` | a |
| `tabBar` → `TabBar` | controller | `TabController` handle | `node.handle<TabController>` `tab_bar.dart:17` | `controller` (null → `DefaultTabController.of`) | f |
| | isScrollable | `boolean` | `:28` | same | a |
| | indicatorWeight, dividerHeight | `number` | `:30,35` | same | a ×2 |
| | indicatorSize | `"tab"\|"label"` | `:20-24` | `TabBarIndicatorSize?` | b |
| | indicatorColor, labelColor, unselectedLabelColor, dividerColor | `ColorInput` | `:29,32-34` | `Color?` | c ×4 |
| | padding | `EdgeInsetsInput` | `:36` | `EdgeInsetsGeometry?` | c |
| | onTap | `(index:number)=>void` | `:18,37` | `ValueChanged<int>` → raw int | d |
| `tabBarView` → `TabBarView` | controller | `TabController` handle | `tab_bar_view.dart:17` | `controller` | f |
| | physics | 5-value union | `:19-26` | `ScrollPhysics?` | c (lossy) |
| | viewportFraction | `number` | `:31` | same | a |

Children: `defaultTabController` → `flexChildren`; `tab` → 0 children: `text`, 1: `child`, >1: wrapped in `Column` (`tab.dart:21-25`; `icon`/`iconMargin` not exposed); `tabBar` → `childWidgets` as `tabs`; `tabBarView` → `childWidgets` as `children`. Exposed: TabBar 12 of 31 params.

### 1.14 Slivers [S] — `D/widgets/slivers/*.dart`, `T/widgets/*.tsx`

Scroll hosts

| Widget → Flutter | Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|---|
| `customScrollView` → `CustomScrollView` | scrollDirection | union | `custom_scroll_view.dart:14,30-31` | `Axis` | b |
| | reverse, shrinkWrap | `boolean` | `:16,18` | same | a ×2 |
| | primary | `boolean` | `node.props['primary']` `:17` | `bool?` | a |
| | anchor | `number` | `:70` | same | a |
| | restorationId | `string` | `:19` | same | a |
| | controller | `ScrollController` handle | `:61` | `controller` | f |
| | physics | 5-value union | `:21-28` | `ScrollPhysics?` | c (lossy) |
| | cacheExtent | `number` | `:59,71-72` | `scrollCacheExtent: ScrollCacheExtent.pixels` (renamed) | c |
| | clipBehavior, keyboardDismissBehavior, dragStartBehavior, hitTestBehavior, paintOrder | unions | `:33-57` | enums | b ×5 |
| `nestedScrollView` → `NestedScrollView` | scrollDirection | union | `nested_scroll_view.dart:35-38` | `Axis` | b |
| | reverse, floatHeaderSlivers | `boolean` | `:39-40` | same | a ×2 |
| | controller | handle | `:41` | `controller` | f |
| | body | `any` | `node.widget('body')` `:69` | `body` | e |
| | header | `(innerBoxIsScrolled:boolean)=>any` | none; TS wrapper (`nested-scroll-view.tsx:20-41`) | `headerSliverBuilder` | h |
| `sliverOverlapAbsorber` → `SliverOverlapAbsorber` | (none) | | `overlapHandleOf(context)` `sliver_overlap_absorber.dart:18` | `handle` resolved from `NestedScrollView` context, never crosses the bridge | — |
| `sliverOverlapInjector` → `SliverOverlapInjector` | (none) | | `sliver_overlap_injector.dart:17` | same | — |

App bars and headers

| Widget → Flutter | Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|---|
| `sliverAppBar` → `SliverAppBar` / `.medium` / `.large` | type | `"small"\|"medium"\|"large"` | `sliver_app_bar.dart:74` | selects one of 3 constructors (params duplicated 3×, `:76-172`) | g |
| | leading, title, flexibleSpace | `JSX.Element` | `node.widget` `:13-15` | same-named `Widget?` | e ×3 |
| | bottom | `JSX.Element` | `:20-26` | `bottom: PreferredSize(child)` | e |
| | bottomHeight | `number` | `:24` (default 48) | `PreferredSize.preferredSize` | g |
| | actions | `JSX.Element[]` | `node.widgetList('actions')` `:16` | `List<Widget>?` | e |
| | pinned, floating, snap, stretch, forceElevated, primary, centerTitle, automaticallyImplyLeading, excludeHeaderSemantics | `boolean` | `:46-56` | same names | a ×9 |
| | elevation, scrolledUnderElevation, expandedHeight, collapsedHeight, toolbarHeight, titleSpacing, stretchTriggerOffset, leadingWidth | `number` | `:58-67` | same names | a ×8 |
| | backgroundColor, foregroundColor, shadowColor, surfaceTintColor | `ColorInput` | `:69-72` | `Color?` | c ×4 |
| | systemOverlayStyle | `"light"\|"dark"` | `:31-35` | `SystemUiOverlayStyle?` | c (lossy) |
| | clipBehavior | union | `:28-29` | `Clip?` | b |
| | onStretchTrigger | `() => Promise<void>` | `node.asyncCallback` `:37-42` | `AsyncCallback?`, awaited | d (async) |
| `flexibleSpaceBar` → `FlexibleSpaceBar` | title, background | `JSX.Element` | `flexible_space_bar.dart:21-22` | same | e ×2 |
| | centerTitle | `boolean` | `:23` | same | a |
| | expandedTitleScale | `number` | `:27` | same | a |
| | titlePadding | `EdgeInsetsInput` | `:24` | `EdgeInsetsGeometry?` | c |
| | collapseMode | 3-value union | `:12-16` | `CollapseMode` | b |
| | stretchModes | `StretchMode[]` | `:18,32-46` | `List<StretchMode>` | b |
| `cupertinoSliverNavigationBar` → `CupertinoSliverNavigationBar` | largeTitle, leading, middle, trailing | `JSX.Element` | `cupertino_sliver_navigation_bar.dart:12-15` | same | e ×4 |
| | bottom | `JSX.Element` | `:20-26` | `PreferredSize` wrap | e |
| | bottomHeight | `number` | `:24` (default 44) | `preferredSize` | g |
| | automaticallyImplyLeading, automaticallyImplyTitle, alwaysShowMiddle, stretch, transitionBetweenRoutes | `boolean` | `:51-56` | same | a ×5 |
| | brightness | `"light"\|"dark"` | `:28-32` | `Brightness?` | b |
| | backgroundColor | `ColorInput` | `:57` | `Color?` | c |
| | border | `BorderInput` | `:58` | `Border?` | c |
| | padding | `EdgeInsetsInput` | `:36-44` | `EdgeInsetsDirectional?` (left→start, right→end) | c |
| `sliverPersistentHeader` → `SliverPersistentHeader` | pinned, floating | `boolean` | `sliver_persistent_header.dart:20-21` | same | a ×2 |
| | minExtent, maxExtent | `number` | `:22-23` (max defaults to min, min to 0) | `SliverPersistentHeaderDelegate.minExtent/maxExtent` getters | g ×2 |
| | children | `(shrinkOffset, overlapsContent) => any` | none; TS wrapper (`sliver-persistent-header.tsx:19-37`) | `delegate.build(context, shrinkOffset, overlapsContent)` | h |
| `pinnedHeaderSliver` → `PinnedHeaderSliver` | (none) | | `flexChildren` `:16` | `child` | — |
| `sliverResizingHeader` → `SliverResizingHeader` | minExtent, maxExtent | `number` | `sliver_resizing_header.dart:19-24` | `min/maxExtentPrototype: SizedBox(height:)` | g ×2 |
| `sliverFloatingHeader` → `SliverFloatingHeader` | animationStyle | `{duration?,curve?:string}` | `sliver_floating_header.dart:20-28` | `AnimationStyle?` | c |
| | snapMode | `"overlay"\|"scroll"` | `:30-34` | `FloatingHeaderSnapMode?` | b |

Lists, grids, layout, effects

| Widget → Flutter | Prop | TS type | Dart decode | Feeds | Cat |
|---|---|---|---|---|---|
| `sliverList` → `SliverList` / `SliverFixedExtentList` / `SliverPrototypeExtentList` | itemExtent | `number` | `sliver_list.dart:20-23` | switches class to `SliverFixedExtentList` | g |
| | prototypeItem | `any` | `node.widget` `:25-31` | switches class to `SliverPrototypeExtentList` | e |
| | addAutomaticKeepAlives, addRepaintBoundaries, addSemanticIndexes | `boolean` | `:15-17` | `SliverChildBuilderDelegate` params (hoisted from the delegate) | a ×3 |
| `sliverGrid` → `SliverGrid` | crossAxisCount, maxCrossAxisExtent, mainAxisSpacing, crossAxisSpacing, childAspectRatio, mainAxisExtent | `number` | `fuseGridDelegate` in `sliver_support.dart:42-66` | `SliverGridDelegateWithMaxCrossAxisExtent` if `maxCrossAxisExtent` present, else `…WithFixedCrossAxisCount` | g ×6 |
| | add* ×3 | `boolean` | `sliver_grid.dart:17-19` | delegate params | a ×3 |
| `sliverFillViewport` → `SliverFillViewport` | viewportFraction | `number` | `sliver_fill_viewport.dart:14` | same | a |
| | padEnds | `boolean` | `:15` | same | a |
| | add* ×3 | `boolean` | `:18-20` | delegate params | a ×3 |
| `sliverReorderableList` → `SliverReorderableList` | onReorder (required) | `(oldIndex, newIndex) => void` | `sliver_reorderable_list.dart:19,31-32` | `ReorderCallback(int,int)` → `{oldIndex,newIndex}`, re-spread to positional in TS (`sliver-reorderable-list.tsx:26-28`) | d |
| | onReorderStart, onReorderEnd | `(index:number)=>void` | `:20-21,33-36` | `void Function(int)` → raw int | d ×2 |
| | itemExtent | `number` | `:37` | same | a |
| | prototypeItem | `any` | `:38` | same | e |
| `reorderableDragStartListener`, `reorderableDelayedDragStartListener` | index (required) | `number` | `:15`/`:16` (default 0) | `index` | a ×2 |
| | enabled | `boolean` | `:16`/`:17` | `enabled` | a ×2 |
| `sliverToBoxAdapter`, `sliverMainAxisGroup`, `sliverCrossAxisGroup` | (none) | | | `child` / `slivers` | — |
| `sliverPadding` → `SliverPadding` | padding | `EdgeInsetsInput` | `sliver_padding.dart:14` | `EdgeInsetsGeometry` | c |
| `sliverFillRemaining` | hasScrollBody, fillOverscroll | `boolean` | `sliver_fill_remaining.dart:13-14` | same | a ×2 |
| `sliverConstrainedCrossAxis` | maxExtent | `number` | `:14` (default ∞) | same (required in Flutter) | a |
| `sliverCrossAxisExpanded` | flex | `number` | `node.int('flex')` `:14` | `flex` (int) | a |
| `sliverLayoutBuilder` → `SliverLayoutBuilder` | children | `(c: SliverConstraintsSnapshot) => any` | none; TS wrapper (`sliver-layout-builder.tsx:34-43`) | `builder(context, SliverConstraints)` | h |
| `decoratedSliver` → `DecoratedSliver` | decoration | `DecorationInput` | `decorated_sliver.dart:18` | `Decoration` | c |
| | position | `"background"\|"foreground"` | `:13-15` | `DecorationPosition` | b |
| `sliverOpacity` | opacity | `number` | `:14` | same | a |
| | alwaysIncludeSemantics | `boolean` | `:15` | same | a |
| `sliverAnimatedOpacity` → `SliverAnimatedOpacity` | opacity | `number` | `sliver_animated_opacity.dart:16` | same | a |
| | alwaysIncludeSemantics | `boolean` | `:19` | same | a |
| | duration | `number` (ms) | `:17` (default 300; required in Flutter) | `Duration` | c |
| | curve | `CurveName` | `node.curve` `:18` | `Curve` | c |
| | onEnd | `() => void` | `:13,20` | `VoidCallback?` | d |
| `sliverIgnorePointer` | ignoring | `boolean` | `:14` | same | a |
| `sliverSafeArea` → `SliverSafeArea` | top, bottom, left, right | `boolean` | `sliver_safe_area.dart:14-17` | same | a ×4 |
| | minimum | `EdgeInsetsInput` | `:18` | `EdgeInsets` | c |
| `refreshIndicator` → `RefreshIndicator` / `.adaptive` | onRefresh | `() => Promise<void>` | `node.asyncCallback` `refresh_indicator.dart:12,23-25` | `RefreshCallback`, awaited | d (async) |
| | adaptive | `boolean` | `:27` | selects `.adaptive` constructor | g |
| | triggerMode | `"onEdge"\|"anywhere"` | `:13-15` | enum | b |
| | color, backgroundColor | `ColorInput` | `:16-17` | `Color?` | c ×2 |
| | displacement, edgeOffset, strokeWidth | `number` | `:18-20` | same | a ×3 |
| `cupertinoSliverRefreshControl` | onRefresh | `() => Promise<void>` | `asyncCallback` `:12,18-22` | `RefreshCallback?`, awaited | d (async) |
| | refreshTriggerPullDistance, refreshIndicatorExtent | `number` | `:15-17` | same | a ×2 |

### 1.15 Children handling (category e, per widget)

| Strategy | Mechanism | Widgets |
|---|---|---|
| `flexChildren` | 0..n children wrapped in an invented `Flex` (or passed bare when exactly 1 and defaults), fed to a single `child` (`node.dart:108-155`) | view, gestureDetector, positioned, scrollView; [S] defaultTabController, refreshIndicator, sliverToBoxAdapter, pinnedHeaderSliver, sliverResizingHeader, sliverFillRemaining, sliverFloatingHeader, both reorderable listeners (13); also page handles (`fuse_page_handle.dart:35-38`) and root (`runtime.dart:246`) |
| `childWidgets` | `List<Widget>` of `FuseNodeWidget`, fed to `children`/`slivers`/`tabs` (`node.dart:102-106`) | stack; [S] customScrollView, sliverMainAxisGroup, sliverCrossAxisGroup, tabBar, tabBarView, tab (custom arity logic), nestedScrollView (returned from the header builder) (8) |
| `onlyChild` | first child only, the rest silently dropped (`sliver_support.dart:70-71`) | [S] 11 single-`sliver` wrappers; 7 force-unwrap (`!`) and crash on zero children (decoratedSliver, sliverAnimatedOpacity, sliverCrossAxisExpanded, sliverIgnorePointer, sliverSafeArea, sliverOpacity, sliverConstrainedCrossAxis), 4 tolerate null |
| lazy delegate | `SliverChildBuilderDelegate` / `itemBuilder` indexing into eagerly created `node.children` (`sliver_support.dart:15-36`) | [S] sliverList, sliverGrid, sliverFillViewport, sliverReorderableList (4) |
| text | concatenation of `__text__` descendants, or span tree | text, [S] textSpan |
| handle children | children's `ownHandle.object` collected | navigator |
| none | children ignored | icon, textField; [S] image, sliverAppBar, flexibleSpaceBar, cupertinoSliverNavigationBar, cupertinoSliverRefreshControl, sliverOverlapInjector |

Named slots (19 props, `node.widget(name)`, `node.dart:166-169`; `node.widgetList(name)` [S] `node.dart:185-189`): textField ×2; [S] image ×2, sliverAppBar ×5, flexibleSpaceBar ×2, cupertinoSliverNavigationBar ×5, nestedScrollView.body, sliverList.prototypeItem, sliverReorderableList.prototypeItem.

### 1.16 Handles

| Handle | JS factory | Dart class | Ctor options (TS → Dart → Flutter) | Methods (TS → RPC → Flutter) | Dart → JS state |
|---|---|---|---|---|---|
| `scrollController` | `createScrollController(opts)` (`T/scroll-controller.ts:11-28`) | `FuseScrollController extends FuseHandle<ScrollController>` (`D/handles/scroll_controller.dart`) | `initialScrollOffset?: number` → `node.double` `:9` → `ScrollController(initialScrollOffset:)` | `animateTo(offset, {duration?})` → `call("animateTo", {offset, duration})` → `object.animateTo(offset, duration: ms default 300, curve: Curves.easeInOut)` (`:23-29`); `jumpTo(offset)` → raw number → `object.jumpTo` (`:30-31`) | `scrollOffset()` signal, seeded in JS from opts (`:14-16`); Dart `addListener` → `node.callback('setScrollOffset')?.call(object.offset)` (`:12-14`) |
| `focusNode` | `createFocusNode()` (`T/focus-node.ts:11-21`) | `FuseFocusNode extends FuseHandle<FocusNode>` (`D/handles/focus_node.dart`) | none | `focus()` → `requestFocus()` (`:18-19`); `unfocus()` (`:20-21`) | `hasFocus()` signal; `setHasFocus` (`:7-9`) |
| `tabController` [S] | `createTabController({length, initialIndex?})` (`T/tab-controller.ts:27-45`) | `FuseTabController extends FuseHandle<TabController> implements TickerProvider` (`D/handles/tab_controller.dart`) | `length`, `initialIndex` → `node.int` `:19-20`; `vsync: this` | `animateTo(index, {duration?})` → `object.animateTo(index, duration: ms default kTabScrollDuration, curve: Curves.ease)` (`:45-54`); `jumpTo(index)` → `object.index = i` (`:55-57`, not a Flutter method) | `index()` signal; `setIndex`, de-duplicated by `_lastIndex` (`:36-40`); `length` is a static JS copy |
| `materialPage` | `materialPage({child, name?, fullscreenDialog?, maintainState?})` returns a `PageConfig` (`T/pages/material.ts:11-16`); the node is created by `<Navigator>` via `<Dynamic component="materialPage" _pageId>` (`T/navigator.tsx:44-50`), not by `createHandle` | `FuseMaterialPage extends FusePageHandle` (`D/handles/material_page.dart`) | `name` (a), `fullscreenDialog` (a), `maintainState` (a) read lazily once (`late final`, `:13-19`); `key` from `_pageId`; `child: Material(child: pageContent)` | none | none |

---

## 2. Counts and the mechanical/hand-designed split

### 2.1 Per-widget category matrix

| Widget | a | b | c | d | e | f | g | h | total |
|---|---|---|---|---|---|---|---|---|---|
| view | | | | | | | 20 | | 20 |
| text (main) | 2 | 3 | 1 | | | | 13 | | 19 |
| icon | 7 | 1 | 4 | | | | | | 12 |
| gestureDetector | 2 | 3 | 1 | 53 | | | 1 | | 60 |
| positioned | 6 | | | | | | 1 | | 7 |
| scrollView | 3 | 5 | 2 | | | 1 | 1 | | 12 |
| stack | | 3 | 1 | | | | | | 4 |
| textField | 16 | 6 | 5 | 5 | 2 | 1 | 17 | | 52 |
| **main total** | **36** | **21** | **14** | **58** | **2** | **2** | **53** | **0** | **186** |
| text (+textScaler) [S] | | | 1 | | | | | | 1 |
| textSpan [S] | | | | 1 | | | 13 | | 14 |
| image [S] | 3 | 3 | 2 | | 2 | | 3 | | 13 |
| tabs ×4 [S] | 8 | 1 | 6 | 1 | | 2 | | | 18 |
| customScrollView [S] | 5 | 6 | 2 | | | 1 | | | 14 |
| nestedScrollView [S] | 2 | 1 | | | 1 | 1 | | 1 | 6 |
| sliverAppBar [S] | 17 | 1 | 5 | 1 | 5 | | 2 | | 31 |
| flexibleSpaceBar [S] | 2 | 2 | 1 | | 2 | | | | 7 |
| cupertinoSliverNavigationBar [S] | 5 | 1 | 3 | | 5 | | 1 | | 15 |
| sliverPersistentHeader [S] | 2 | | | | | | 2 | 1 | 5 |
| sliverResizingHeader, sliverFloatingHeader [S] | | 1 | 1 | | | | 2 | | 4 |
| sliverList, sliverGrid, sliverFillViewport [S] | 11 | | | | 1 | | 7 | | 19 |
| sliverReorderableList + 2 listeners [S] | 5 | | | 3 | 1 | | | | 9 |
| refreshIndicator, cupertinoSliverRefreshControl [S] | 5 | 1 | 2 | 2 | | | 1 | | 11 |
| sliverAnimatedOpacity, sliverOpacity, sliverIgnorePointer, sliverSafeArea, sliverPadding, decoratedSliver, sliverFillRemaining, sliverConstrainedCrossAxis, sliverCrossAxisExpanded, sliverLayoutBuilder [S] | 13 | 1 | 5 | 1 | | | | 1 | 21 |
| **slivers-added total** | **78** | **18** | **28** | **9** | **17** | **4** | **31** | **3** | **188** |
| **all** | **114** | **39** | **42** | **67** | **19** | **6** | **84** | **3** | **374** |

### 2.2 What "mechanical" really requires

| Tier | Props | Share | What a generator needs |
|---|---|---|---|
| Zero-decision: a, b, f, callbacks with no payload (27) or a primitive payload (5) | 191 | 51.1% | Flutter ctor signature only |
| Codec-dependent: c (42), struct-payload callbacks (35: 34 gesture + `onReorder`), slots (19) | 96 | 25.7% | a hand-written codec per Dart type (~30 inbound, 14 outbound Details/constraints shapes) plus the slot convention |
| Rule-expressible invention: flattened `TextStyle` (36), flattened grid delegate (6) | 42 | 11.2% | a "flatten this nested object, with renames" directive (`height→lineHeight`, `decoration→textDecoration`) |
| Un-inventable | 45 | 12.0% | hand design |

Breakdown of the 84 g-props: TextStyle flattening 36 (Text 13, TextField 10, TextSpan 13); View 20; `flex` 4; TextField-specific 6; Image 3; delegate/prototype synthesis 11 (grid 6, sliverList.itemExtent 1, persistent-header extents 2, resizing-header extents 2); constructor-variant selectors 2 (`sliverAppBar.type`, `refreshIndicator.adaptive`); `bottomHeight` 2.

Caveat on category d: the 34 struct payloads are projections of Flutter Details classes but their flattened field naming (`x,y,localX,localY,vx,vy,dx,dy`) is a hand-designed outbound codec, and it drops fields (`sourceTimeStamp`, `localOffsetFromOrigin`, `PointerDownEvent`).

### 2.3 Thin vs thick widgets (47)

| Class | Count | Widgets |
|---|---|---|
| Thin: stateless, one Flutter constructor, decode-and-forward only | 28 (60%) | icon, positioned, stack, scrollView, gestureDetector; [S] customScrollView, decoratedSliver, flexibleSpaceBar, pinnedHeaderSliver, 2 reorderable listeners, sliverAnimatedOpacity, sliverConstrainedCrossAxis, sliverCrossAxisExpanded, sliverCrossAxisGroup, sliverMainAxisGroup, sliverFillRemaining, sliverIgnorePointer, sliverOpacity, sliverPadding, sliverSafeArea, sliverToBoxAdapter, sliverFloatingHeader, defaultTabController, tabBar, tabBarView, cupertinoSliverRefreshControl, cupertinoSliverNavigationBar |
| Medium: one Flutter widget family, but constructor/class selection, wrapper synthesis, or context lookup | 12 (26%) | text (plain path); [S] tab, image, sliverAppBar (3 ctors), refreshIndicator (2 ctors), sliverList (3 classes), sliverGrid (2 delegates), sliverFillViewport, sliverResizingHeader, sliverReorderableList, sliverOverlapAbsorber, sliverOverlapInjector |
| Thick: state, multi-widget composition, or bridging tricks | 7 (15%) | view (13-layer composition), textField (stateful controller reconciliation, formatters, decoration), navigator (+210-line JS controller); [S] textSpan/rich text (recognizer lifecycle, span tree), nestedScrollView, sliverLayoutBuilder, sliverPersistentHeader |

The thick 7 hold 98 of 374 props (26%); 118 (32%) if Text is counted as thick on the branch, where its rich path is stateful. They also carry most real usage (View and Text are the basic building blocks of every screen).

### 2.4 Reverse coverage: Flutter params not exposed

For the 23 widgets that wrap exactly one Flutter widget (params excluding `key`):

| Widget | Flutter params | Exposed | | Widget | Flutter params | Exposed |
|---|---|---|---|---|---|---|
| Icon | 13 | 12 | | SliverAppBar | 38 | 29 |
| GestureDetector | 65 | 60 | | FlexibleSpaceBar | 7 | 7 |
| Positioned | 7 | 7 | | CupertinoSliverNavigationBar | 19 | 14 |
| SingleChildScrollView | 12 | 12 | | CupertinoSliverRefreshControl | 4 | 3 |
| Stack | 5 | 5 | | RefreshIndicator | 12 | 8 |
| Text | 17 | 8 | | TabBar | 31 | 12 |
| TextField | 71 | 37 | | TabBarView | 6 | 4 |
| Image | 19 | 11 | | Tab | 5 | 3 |
| CustomScrollView | 19 | 15 | | DefaultTabController | 4 | 3 |
| NestedScrollView | 12 | 6 | | SliverAnimatedOpacity | 6 | 6 |
| SliverSafeArea | 6 | 6 | | SliverReorderableList | 13 | 7 |
| MaterialPage | 9 | 4 | | **Total** | **~400** | **~279 (70%)** |

Nested value types are thinner: `TextStyle` 13 of 26 fields, `InputDecoration` 18 of 58, `BoxDecoration` 8 of 8. The unexposed ~30% is dominated by types with no codec (`TextStyle` as an object, `ShapeBorder`, `IconThemeData`, `ScrollBehavior`, `MouseCursor`, `WidgetStateProperty`, `TextSelectionControls`), builders and sync-return callbacks (`buildCounter`, `contextMenuBuilder`, `notificationPredicate`, `proxyDecorator`, `itemExtentBuilder`, `frameBuilder`), and params newer than the wrapper (`GestureDetector.onTapMove`, `SliverReorderableList.onReorderItem`, `SliverAppBar.actionsPadding`).

---

## 3. Inconsistencies and drift

Name-level drift is almost absent: across 374 props the TS key and the Dart key agree every time (the PR 1 scanner's `onlyDart=0` is real). The drift is in types, enum sets, defaults, and half-wired props.

### 3.1 Typed in TS, not (fully) honoured in Dart

1. `TextFieldProps.flex` (`T/widgets/text-field.tsx:107`) is never read; `FuseTextField` has no children.
2. `TextProps.textScaler` [S] (`T/widgets/text.tsx:32`) is applied only on the rich path (`D/widgets/text.dart:75,87`); the plain `Text` path (`:22-31`) ignores it.
3. `fontStyle: "normal"` (`text.tsx:12`, `text-field.tsx:90`) is treated as unset; Dart only tests `== 'italic'` (`text.dart:16`, `text_field.dart:127`), so it cannot override an inherited italic.
4. `blendMode` / `colorBlendMode` are typed `string` (`icon.tsx:30`, `types.ts:87`, `image.tsx:30` [S]); Dart accepts 15 names and returns null for anything else (`utils.dart:341-360`).
5. `ShadowInput.spreadRadius` on `Icon.shadows` and `Text.shadows` is meaningless: Icon decodes with the BoxShadow parser and casts (`icon.dart:33`), Text uses a second private parser that ignores it (`text.dart:129-139`).
6. `sliverFloatingHeader.animationStyle.curve` is `string` (`sliver-floating-header.tsx:10`) while `sliverAnimatedOpacity.curve` is a local, unexported `CurveName` (`sliver-animated-opacity.tsx:3-17`); both hit the same `parseCurve`, which maps unknown names to `linear` silently.
7. `MaterialPageProps` are read once at handle construction (`material_page.dart:13`, `late final`); later prop changes are ignored, though nothing in the TS type says so.

### 3.2 Read in Dart, not typed in TS

8. `clipBehavior: 'antiAliasWithSaveLayer'` is accepted by `parseClip` (`utils.dart:367`) but absent from all five inline TS unions (`view.tsx:27`, `scroll-view.tsx:10`, `stack.tsx:7`; [S] `custom-scroll-view.tsx:12`, `sliver-app-bar.tsx:43`).
9. `flex` is read through `flexChildren` by nine [S] widgets whose TS props do not declare it (defaultTabController, refreshIndicator, sliverToBoxAdapter, pinnedHeaderSliver, sliverResizingHeader, sliverFillRemaining, sliverFloatingHeader, both reorderable listeners), and by page handles (`MaterialPageProps` has no `flex`).
10. The `alignment` prop of any widget placed inside a rich `<Text>` is read by the parent as a `PlaceholderAlignment` (`text.dart:119,158` [S]). `InlineWidgetAlignment` is exported (`text.tsx:48-54`) but attached to no props interface, and the name collides with `View`/`Image`/`Stack` `alignment` (`AlignmentString`); `"center"` falls through to `middle`.
11. Wire-private props exist only inside wrappers and are untyped: `onHeader`, `onConstraints`, `onLayout`, `onDidRemovePage`, `_pageId`, `setScrollOffset`, `setHasFocus`, `setIndex`.

### 3.3 Defaults that differ from Flutter (silent behaviour changes)

| Prop | solid-fuse default | Flutter default | Ref |
|---|---|---|---|
| `Stack.clipBehavior` | `Clip.none` | `Clip.hardEdge` | `stack.dart:19`, `utils.dart:369` |
| `TextField.textAlign` | `TextAlign.left` | `TextAlign.start` | `text_field.dart:221` |
| `TextField.keyboardType` | always `TextInputType.text` | `multiline` when `maxLines != 1` | `text_field.dart:198` |
| `InputDecoration.enabledBorder/focusedBorder` | forced equal to `border` | theme-derived | `text_field.dart:160-162` |
| `BoxShadow.color` / `Shadow.color` | `0x40000000` | `0xFF000000` | `utils.dart:201`, `text.dart:132` |
| `LinearGradient.begin/end` | `topCenter → bottomCenter` | `centerLeft → centerRight` | `utils.dart:241-242` |
| `DecorationImage.fit`, `Image.fit` | `cover` | null | `utils.dart:324` |
| Flex `crossAxisAlignment` / `mainAxisSize` (via `flex`) | `start` / `min` | `center` / `max` | `node.dart:118-136` |
| `ScrollController.animateTo` | duration 300 ms, curve `easeInOut` fixed | both required | `scroll_controller.dart:27-28` |
| `TabController.animateTo` [S] | curve fixed to `Curves.ease` (same as Flutter's default, but not overridable) | `curve` param | `tab_controller.dart:53` |
| `HitTestBehavior` absent | `gestureDetector`: null; scroll views: `opaque` | same as Flutter in both cases, but the same parse is written with two different fallbacks | `gesture_detector.dart:137`, `scroll_view.dart:50` |

### 3.4 Same Flutter concept, different names or encodings

12. `TextStyle.height`: `lineHeight` on Text (`text.tsx:14`), `height` on TextField (`text-field.tsx:93`).
13. TextStyle subsets differ: Text 13 fields; TextField 10 (no `wordSpacing`, `backgroundColor`, `shadows`); `hintStyle` 4. Three separate builders (`text.dart:44-58`, `text_field.dart:122-135`, `:146-153`).
14. Flex factor: `grow` on View (`view.tsx:24`), `flex: number` on `SliverCrossAxisExpanded` [S] (`sliver-cross-axis-expanded.tsx:5`), while `flex` everywhere else is a `FlexInput` object.
15. `Offset` has four inbound encodings: `{x,y}`, `offsetX/offsetY`, `translateX/translateY`, and (outbound) flattened pairs.
16. Named constructors: `type: "small"|"medium"|"large"` on SliverAppBar vs `adaptive: boolean` on RefreshIndicator; `type` on Image means something else (provider kind).
17. `PreferredSizeWidget` slots: `bottom` + `bottomHeight`, default 48 on SliverAppBar, 44 on the Cupertino bar.
18. `placeholder` and `hintText` are aliases on TextField (`text_field.dart:139`, `hintText` wins).
19. Callback payload conventions vary: flattened object (gestures), object re-spread to positional args in TS (`onReorder`, persistent-header `children`), raw primitive (`TabBar.onTap`, `onChanged`), payload dropped (`onTapOutside`).
20. Slot typing: `JSX.Element` in 4 files, `any` in 4 ([S] `image.tsx:37-39`, `sliver-list.tsx:5`, `sliver-reorderable-list.tsx:17`, `nested-scroll-view.tsx:17`).
21. `cacheExtent` [S] is named after Flutter's legacy param but feeds the newer `scrollCacheExtent`.
22. Two idioms for the same read: `node.props['x'] as bool?` (`text.dart:26`, `scroll_view.dart:17`) vs `node.bool('x')`.

### 3.5 Duplication that has already diverged or will

23. Enum parsers re-implemented inline per widget: `ScrollPhysics` ×3, `Axis` ×4, `DragStartBehavior` ×3, `HitTestBehavior` ×3, `TextAlign` ×2 (different fallbacks), `TextDirection` ×2, `TextDecoration` ×2, `TextDecorationStyle` ×2, `Brightness` ×2. The matching TS unions are also retyped inline per file.
24. Named-color and font-weight tables are hand-duplicated in TS and Dart (`types.ts:4-7,54-57` vs `utils.dart:7-24,376-395`); currently in sync.
25. `ImageInput.fit` on main lacks `scaleDown`; the branch adds it in both places (`types.ts:74-75` [S], `utils.dart:324` [S]).
26. `SliverAppBar` forwards the same 29 arguments three times (`sliver_app_bar.dart:76-172`).
27. Requiredness is not transferred: `IconProps.data`, `ImageProps.src`, `index`, `length` are required in TS but defaulted in Dart; `DecoratedSliver.decoration`, `SliverAnimatedOpacity.duration`, `SliverConstrainedCrossAxis.maxExtent`, `RefreshIndicator.onRefresh` are required in Flutter but optional in TS and defaulted in Dart.
28. Child arity is untyped and inconsistent (section 1.15): seven single-sliver wrappers crash on zero children, four do not, all drop extras silently.
29. Handle method types say `void` but return the RPC promise (`focus-node.ts:6-7,17-18`, `scroll-controller.ts:6-7,24-25`, `tab-controller.ts:11-13` [S]); the Dart side also does not await `animateTo`, so JS cannot wait for completion.
30. `T/index.ts:105-107` [S] exports `RefreshIndicator`, `CupertinoSliverRefreshControl`, `CupertinoSliverNavigationBar` without their props types, unlike every other widget.
31. Stale references to a removed `<richText>` tag in comments and an assert message (`text.dart:92,186,196` [S]).
32. Docs are a third hand-written copy. `packages/docs/content/docs/building/ui-and-layout.mdx` lists 13 of Text's 19 props and 7 of ScrollView's 12, types enums as `string`, and states "Every element that accepts children supports `flex`", which is false for Stack and (on the branch) for 24 of the 32 slivers.

---

## 4. Why the PR 1 scanner missed 55 props

The scanner (`/home/claude/wt/experiments-env/experiments/dart-to-ts/lib/scrape.dart`) is not regex-based; it parses with `package:analyzer` without resolution and visits `node.<accessor>('literal')` calls inside class declarations. I re-ran it from a scratch copy: main reproduces `matched=131 onlyDart=0 onlyTs=55` exactly.

| Root cause | Props | Detail |
|---|---|---|
| Key passed through a helper parameter | 34 | Every payload-carrying gesture callback goes through `_tapDown(String name)` etc., which call `node.callback(name)` (`gesture_detector.dart:21-128`, invoked `:166-228`). The scanner records 13 "dynamic key" sites (`scrape.dart:176-178`) but cannot name the 34 props. The README's "loops over event names" description is inaccurate; it is a helper-parameter indirection. |
| Reads in top-level functions outside the class | 17 | `_buildFormatters`, `_textStyle`, `_buildDecoration` take `FuseNode node` and are top-level (`text_field.dart:102,122,137`). The visitor only walks `ClassDeclaration`s (`scrape.dart:79-82`). Props: allowPattern, denyPattern; 10 style props; placeholder, hintText, decoration, prefixIcon, suffixIcon. |
| Reads in a shared getter in another file | 3 | `flex` on gestureDetector, positioned, view is read inside `FuseNode.flexChildren` (`node.dart:109`). ScrollView's `flex` was found only by accident (`scroll_view.dart:14` reads `flex.direction`). |
| Not a scanner failure: real dead prop | 1 | `TextFieldProps.flex` is typed and never read (3.1 item 1). |
| **Total** | **55** | |

Losses the 131/55 figure hides:

- 52 of the 131 "matched" props have a wrong or weaker type: enums parsed by a cross-file helper (`parseClip`) or via a local variable (`final fitStr = node.string('fit'); switch (fitStr)`, `stack.dart:13-14`) come out as `string`; `== 'italic'` yields a one-member union; nested objects (`decoration` 12+4 keys, `IconData` 5, `transform` 4, `FlexInput` 5) are `Record<string, unknown>`; every callback is `(value?: unknown) => void`; handles are `unknown`; everything is optional.
- Class-to-interface matching is by name mangling (`compare.ts:43`); `FuseNavigatorWidget` finds no interface.

Re-run against the slivers branch (not in the PR): **275 found of 374 (73.5%), 99 missed, 2 false "undocumented" props** (`onHeader`, `onConstraints`). New root causes beyond the 55:

| Root cause | Props |
|---|---|
| Accessors added to `FuseMap`/`FuseNode` on the branch that the scanner's hand-kept `accessorTypes` table (`scrape.dart:17-40`) does not know: `boxFit`, `imageRepeat`, `curve`, `asyncCallback`, `widgetList` | 7 (image fit/repeat, curve, 2× onRefresh, onStretchTrigger, actions) |
| Cross-file helper `fuseGridDelegate(node)` | 6 |
| Refactor moved Text's style reads into top-level `buildTextStyle`; `textScaler` lives in `_FuseRichTextState`, which maps to no interface | 14 (13 were found on main) |
| `TextSpanProps`: the marker class reads nothing; spans are decoded by a top-level function called from the parent | 14 |
| Builder props whose public name differs from the wire name (`header`/`onHeader`, `children`/`onConstraints`, `children`/`onLayout`) | 3 |

What this says about direction:

- Scraping Dart builders recovers prop **names and wire primitives**, which is the one thing that has never drifted. It is weakest exactly where drift occurs: enum sets, nested shapes, payload shapes, defaults, requiredness.
- It is fragile under ordinary refactoring (13 Text props vanished when a helper was extracted) and needs its own third table of accessor→TS types that drifted within one branch.
- It leaves the Dart side fully hand-written, so it removes at most half of the double authoring and none of the Flutter-coverage gap (section 2.4).
- A resolved-AST variant would fix the helper and cross-file cases but still cannot see payload shapes built as map literals or the Flutter param a value ends up in without data-flow analysis.
- The data favours a declared source of truth (Flutter's constructor signatures plus a codec registry and per-widget overrides) that emits both the Dart decoder and the TS types, with hand-written escape hatches for the 7 thick widgets.

---

## 5. Bridging conventions a generator must know

### 5.1 Transport and ops

- One routed pipe each way with JSON-shaped values (maps, lists, numbers, bools, strings, null) marshalled by fjs `JsValue` (`T/channels.ts:27-69`, `D/channels.dart:39-71`). JS→Dart `send` is fire-and-forget; `call` returns a promise with a 30 s default timeout and first flushes pending ops (`channels.ts:48`).
- Tree mutations travel as a batched journal on channel `_ops`: `create{id,type,props}`, `setText{id,text}`, `setProp{id,name,value}`, `insert{parentId,childId,index}`, `remove{parentId,childId}`, `dispose{id}` (`T/renderer.ts:31-37`; applied at `D/runtime.dart:170-228`).
- JSX elements are created with an empty prop map; every prop arrives as a separate `setProp` in the same batch (`renderer.ts:85-90,114-137`). Only `createHandle` inlines plain props into `create` (`T/handle.ts:55-75`).
- Dart rebuilds a node's widget on any prop change (`ListenableBuilder` on the node, `D/node_widget.dart:19-22`) and re-decodes every prop on each build; nothing is cached.
- `children` and `ref` never cross as props. `children` becomes `insert` ops.

### 5.2 Callbacks (Dart → JS)

- A function-valued prop is stored in a JS map keyed `"${nodeId}:${name}"` and sent as the literal `true` (`renderer.ts:115-118`). Dart's `node.callback(name)` returns a closure only when `props[name] == true` (`node.dart:159-162`).
- Invocation: `_functionCall {nodeId, name, value}` (`runtime.dart:161-167` → `renderer.ts:24-27`). Fire-and-forget, **one positional value**, no return. Multi-arg Flutter callbacks must be packed into an object and, if desired, re-spread in a TS wrapper.
- [S] awaitable variant: `node.asyncCallback(name)` → `channels.call('_functionCallAsync', …)` resolves with the JS handler's (awaited) return (`node.dart:170-173` [S], `runtime.dart:193-202` [S], `renderer.ts:33-35` [S]). Used for `Future<void>` callbacks; nothing uses the returned value yet.
- There is no synchronous Dart→JS call with a result. Any Flutter callback that must return a value synchronously (builders, predicates, validators, `itemExtentBuilder`, `proxyDecorator`) cannot be projected.
- Hazards: the `true` marker is indistinguishable from a boolean prop set to `true`; handlers are never removed from the JS map when a node is removed (only `handlers.clear()` on full unmount, `renderer.ts:217`); because any function value becomes a callback, a slot prop given a reactive accessor (for example a `<Show>` result) would be registered as a handler instead of a node (inferred from `renderer.ts:115`; not exercised).

### 5.3 Node references, slots, handles as props

- A prop value that is a `FuseNode`, or an object with a `.node` that is one, is sent as `{_node: id}` (`renderer.ts:120-131`); Dart replaces it with the live `FuseNode` in `props` and disposes a previously referenced subtree (`runtime.dart:198-205`). `node.widget(name)` wraps it in `FuseNodeWidget`; `node.handle<T>(name)` returns `ownHandle.object` after a runtime type check (`node.dart:166-208`).
- [S] arrays: each element is mapped the same way (`renderer.ts:127-141` [S], `runtime.dart:232-240` [S]) → `node.widgetList(name)`.
- References are recognised **only at the top level of a prop (or one array level)**. A node nested inside an object prop is not converted. This is why `prefixIcon`/`suffixIcon` are hoisted out of TextField's `decoration` and why `Tab.icon` and similar are absent.
- Slot nodes are orphans: created by JSX, never inserted, owned by the prop, removed when the owner is removed (`runtime.dart:237-239`).

### 5.4 Handles and RPC

- `createHandle(type, props)` creates a node of a type registered with `runtime.registerHandle` (`runtime.dart:58-60`); the factory runs during the `create` op and is stored as `node.ownHandle` (`:185-188`). Plain props are available to the constructor; function and ref props arrive afterwards as `setProp`.
- Handle nodes created through JSX (pages via `<Dynamic>`) get **no props at construction**, so such handles must read lazily (`late final object`, `material_page.dart:13`).
- JS→Dart RPC: `call(method, value?, {timeout})` → channel `_handleCall {node, method, value}` → `FuseHandle.call(String method, dynamic value)` (`handle.ts:90-95`, `runtime.dart:140-154`, `fuse_handle.dart:22`). One string method name, one value, dispatch by hand-written `switch`; unknown method throws; a disposed node rejects with `HandleDisposedError`.
- Dart→JS state: there is no state primitive. The JS factory passes a signal setter as a function prop (`setScrollOffset`, `setHasFocus`, `setIndex`); Dart calls it from a listener. The same "setter-callback" trick drives the three builder widgets (`onHeader`, `onConstraints`, `onLayout`).
- Lifetime: auto-dispose via `onCleanup` inside an owner, else manual (`handle.ts:78-86`); `dispose` op → `FuseHandle.dispose()` (`node.dart:227-230`).
- A handle is passed to a widget as the whole JS object; TS discriminates kinds with the phantom `Handle<K>` type (`handle.ts:20`); Dart checks `FuseHandle<T>` at use.

### 5.5 Text, debug, and private props

- Strings in JSX become `__text__` nodes with `props.text`, updated by `setText` (`renderer.ts:92-108`, `runtime.dart:189-193`). `text` consumes them by concatenation; anywhere else a bare `__text__` renders as a default `Text` (`runtime.dart:248-250`).
- `_component`: in non-release mode the nearest component function name is put in the `create` props (`renderer.ts:87-88,183-193`), stripped into `FuseNode.component` (`node.dart:76`), and shown in the inspector and dev-error boxes (`node_widget.dart:30-41`, `runtime.dart:267-292`).
- `_pageId`: assigned by `<Navigator>` to each page node, becomes the `Page` key (`navigator.tsx:46`, `fuse_page_handle.dart:21-29`).

### 5.6 Outbound (Dart → JS) payload shapes in use

| Source Dart type | JSON sent |
|---|---|
| `String`, `int`, `double`, `bool` | raw value (`onChanged`, `TabBar.onTap`, `setScrollOffset`, `onHeader`) |
| `Offset` global + local | `{x, y, localX, localY}` flattened into the parent object |
| `Velocity` | `{vx, vy}` |
| `Offset delta` | `{dx, dy}`; `offsetFromOrigin` → `{offsetX, offsetY}` |
| enums (`PointerDeviceKind`, `AxisDirection`, `GrowthDirection`, `ScrollDirection`) | `.name` string |
| `(int, int)` reorder args | `{oldIndex, newIndex}` |
| `Page` | `{id}` |
| `SliverConstraints` [S] | 9-field snapshot (`sliver_layout_builder.dart:22-32`) |
| header delegate args [S] | `{shrinkOffset, overlapsContent}` |

Inbound shapes are in section 1.1.

### 5.7 How builder-style APIs were bridged (category h and relatives)

All three use one template: the Dart builder pushes its arguments to JS through a private setter-callback and synchronously returns whatever children the node currently has; the TS wrapper holds a signal and renders `props.children(signal())` as a reactive child, so the result arrives as ordinary ops a frame later.

| Widget [S] | Flutter builder | Dart side | TS side | Notes |
|---|---|---|---|---|
| nestedScrollView | `headerSliverBuilder(context, innerBoxIsScrolled) → List<Widget>` | pushes via `onHeader` only when the flag changes, returns `node.childWidgets` (`nested_scroll_view.dart:58-68`) | signal + `{() => props.header(innerBoxIsScrolled())}` (`nested-scroll-view.tsx:21-40`) | de-dup guard is load-bearing against feedback loops (`:43-51`) |
| sliverLayoutBuilder | `builder(context, SliverConstraints) → Widget` | pushes a 9-field map on every layout, no de-dup (`sliver_layout_builder.dart:21-35`) | signal of a fresh object each time, so the child function re-runs on every push (`sliver-layout-builder.tsx:35-41`) | one-frame lag by construction |
| sliverPersistentHeader | `delegate.build(context, shrinkOffset, overlapsContent)` | pushes via `onLayout` on every build (`sliver_persistent_header.dart:50-54`); extents are plain props | signal + positional re-spread (`sliver-persistent-header.tsx:20-35`) | fires every scroll frame while shrinking |

Related, not counted as h:

- Lazy lists are **not** bridged as `itemBuilder`. JS renders every child eagerly (full JS node tree and Dart `FuseNode`s); Dart only defers widget inflation through `SliverChildBuilderDelegate` over `node.children`, with `findChildIndexCallback` keyed by node id (`sliver_support.dart:15-36`). There is no JS-side virtualization.
- `Image.loadingBuilder` / `errorBuilder` are flattened into static slots (`image.dart:37-45`).
- `SliverOverlapAbsorberHandle` is resolved from `BuildContext` on the Dart side so it never has to cross the bridge (`nested_scroll_view.dart:80-86`).
- `TextSpan.recognizer` needs a stateful owner to dispose recognizers (`text.dart:52-73` [S]).

---

## 6. Handles: the pattern and how mechanical it is

### 6.1 The pattern

JS factory (15 to 20 lines each): create one signal per mirrored property; `createHandle(type, {...ctorOptions, setX})`; return `{node, x: accessor, method: (...args) => call("method", packedArgs), dispose}`.

Dart class (30 to 66 lines each): `extends FuseHandle<T>`; construct `T` from `node.<accessor>(option)`; `object.addListener(() => node.callback('setX')?.call(object.x))`; `call()` is a `switch` on the method name that unpacks `value` and invokes the method; `dispose()` forwards.

### 6.2 Could `createScrollController` + `FuseScrollController` be generated from Flutter's `ScrollController`?

Flutter's class (`/opt/flutter/packages/flutter/lib/src/widgets/scroll_controller.dart:72-340`): ctor `{initialScrollOffset, keepScrollOffset, debugLabel, onAttach, onDetach}`; getters `initialScrollOffset, positions, hasClients, position, offset`; methods `animateTo(double, {required Duration duration, required Curve curve}) → Future<void>`, `jumpTo(double)`, `attach`, `detach`, `dispose`, `createScrollPosition`, `debugFillDescription`; it is a `ChangeNotifier`.

| Piece | Derivable from the class? | Today |
|---|---|---|
| Ctor options → `opts` | Yes for primitives (`initialScrollOffset`, `keepScrollOffset`, `debugLabel`); `onAttach`/`onDetach` take a `ScrollPosition` (needs an outbound codec) | only `initialScrollOffset` |
| Methods → RPC | Yes, mechanically, given codecs for `Duration` and `Curve` and an arg-packing rule (positional + named → one object) | `animateTo` drops `curve` (hard-coded), defaults `duration`, and does not return the `Future`; `jumpTo` is 1:1 |
| Which methods to expose | No. `attach`, `detach`, `createScrollPosition`, `debugFillDescription` are public but framework-internal; needs an allow-list or annotation | hand-picked 2 |
| `Listenable` → signals | Only partly. `ChangeNotifier` says "something changed", not what. Which getters to mirror (`offset`, `hasClients`), their initial values, and when reading them is legal are not in the type: `offset` asserts exactly one attached position (`scroll_controller.dart:170-179`), so a naive "mirror every getter on notify" throws before attach or when one controller drives two scroll views | hand-picked `offset`, renamed `scrollOffset`, seeded on the JS side from `opts` |
| Getters returning non-serializable objects (`position`, `positions`) | No | absent |
| Update policy (every-frame pushes over a fire-and-forget channel, de-dup, throttling) | No | every notification is forwarded |
| Synchronous reads | Impossible over the bridge; a mirrored signal is the only sync read path | — |

Estimate: for a plain `ChangeNotifier` controller, constructor options, method RPC, dispose, and the TS typings (most of the lines) are generatable from the class plus an allow-list. The state-mirroring spec (which getters, guards, de-dup, initial values) must be declared by hand; it is small (one line per mirrored field) but not inferable.

### 6.3 What is bespoke in each existing handle

- **scrollController**: signal renamed (`offset` → `scrollOffset`); JS-side seeding; `Duration` as ms; fixed curve; dropped `Future`; `void`-typed methods that actually return promises.
- **focusNode**: methods renamed (`requestFocus` → `focus`); only `hasFocus` mirrored; no ctor options (`canRequestFocus`, `skipTraversal`, `onKeyEvent`); `nextFocus`/`previousFocus`/`hasPrimaryFocus` absent.
- **tabController** [S]: needs a `TickerProvider`; the handle implements it with bare `Ticker`s because handles live outside the widget tree (`tab_controller.dart:15-34`). `jumpTo` is invented (assigns `index`). Listener de-dup via `_lastIndex`. `length` is a static JS copy; `animation`, `offset`, `indexIsChanging`, `previousIndex` are not mirrored. Environmental dependencies like `vsync` or `BuildContext` are a class of requirement a generator must have an explicit hook for.
- **materialPage**: not a controller. A "handle" here means "a node type that yields a non-widget Dart object". No RPC and no state; the object is a `Page` built once; content comes from the node's children through `ListenableBuilder` (`fuse_page_handle.dart:35-38`); identity comes from `_pageId`; the JS side is a config factory consumed by `<Navigator>`. Ctor params are a mechanical subset (3 of 9), the rest is a distinct pattern.
- **NavigationController** (`T/navigation-controller.ts`): JS-only state with no Dart counterpart; nothing to generate.

### 6.4 Implication

Handles split into two shapes that should not share one generator template: controller handles (ctor options, RPC methods, mirrored state; largely mechanical with a small declared spec) and object-provider handles (pages; construct-once objects consumed by a specific parent widget).
