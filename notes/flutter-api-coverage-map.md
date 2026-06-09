# Flutter API Coverage Map — solid-fuse

> Internal roadmap artifact. Status as of 2026-06-08. 49 registered elements (18 core + 31 sliver), 4 controller handles, 1 host namespace. Numbers reconciled against the adversarial critique (deduped, factual mislabels fixed, disputed priorities adjusted).

## 1. Executive summary

Coverage is **deep where it counts for a renderer-driven, reactive stack and shallow exactly where Flutter's own design libraries live.**

**Strong (effectively done):**
- **Box layout** — the `view` mega-primitive folds ~14 box widgets into props (Flex/Padding/Align/Decoration/Clip/Constraints/Opacity/Transform/Visibility/Flexible). There is no separate Container/Padding/Center/SizedBox element by design — do not read those as gaps.
- **Slivers** — 31 elements, near-exhaustive: lists/grids (lazy builder-delegate), the full modern header trio, cross/main-axis groups, NestedScrollView + overlap absorber/injector, reorderable. This is the most complete category.
- **MediaQuery** — fully replaced by the reactive `host` namespace (brightness/size/padding/insets/orientation/textScale…).
- **Gestures** — `gestureDetector` + `listener` give near-exhaustive pointer/tap/drag/pan/scale coverage with rich event serialization. Pure `widgets` layer, zero decoupling risk.
- **Text** — plain + rich (Text.rich) with recognizer lifecycle, WidgetSpan interleaving, broad TextStyle.
- **Tabs / pull-to-refresh** — shipped (Material/Cupertino, see §3).
- **Async/derived state** — intentionally absent as widgets; Solid owns it (see §2).

**The headline gaps, in order:**
1. **No ergonomic lazy box-level list/grid (`ListView.builder`/`GridView.builder`).** `sliverList` is eager and verbose; this is the single biggest *day-to-day* ergonomic gap.
2. **No explicit-animation stack.** Everything hinges on a missing `AnimationController` handle — the keystone. The hard vsync/bridging problem is *already solved* (the `tabController` handle implements `TickerProvider`), so this is unusually high-leverage.
3. **No Material buttons of any kind**, and no `Material`/`InkWell` ancestor for ink/ripple. The most-requested missing surface.
4. **Zero accessibility surface** — no `Semantics` anywhere.
5. **No desktop/web hover** — no `MouseRegion`/cursor.

## 2. The three multipliers — what "missing" actually means

Three mechanisms collapse large swaths of Flutter's widget catalog. A widget appearing nowhere as an element is frequently *intentional*, not a gap.

### `view` — the box mega-primitive (🟫 "via-view")
One element absorbs, via props:

| Folded widget | view prop |
|---|---|
| Row / Column / Flex | `flex.{direction, gap→spacing, align, justify, expand}` |
| Expanded / Flexible | `grow` + `fit:'tight'｜'loose'` |
| Padding ×2 | `padding`, `margin` |
| Align / Center | `alignment` (`'center'`) |
| SizedBox | `width` / `height` |
| ConstrainedBox | `minWidth/maxWidth/minHeight/maxHeight` |
| AspectRatio | `aspectRatio` |
| DecoratedBox ×2 | `decoration`, `foregroundDecoration` (color/border/radius/shadow/gradient/image/shape/blendMode) |
| ClipRRect / ClipRect | `clipBehavior` (+ borderRadius → RRect) |
| Opacity | `opacity` |
| Transform.rotate/scale/translate | `transform.{rotate,scale,translateX,translateY}` (⚠ partial — no Matrix4/skew/origin/alignment) |
| IgnorePointer | `ignorePointer` |
| Visibility | `visible` (false only) |
| **Container** | the composition of all the above |

→ Do not file Container/Padding/Center/SizedBox/Align/etc. as missing. The only real `view` sub-gap is **transform** (no matrix/skew/origin).

### `host` — MediaQuery as reactive namespace (🛰 "via-host")
`brightness() · size() · devicePixelRatio() · padding() · viewInsets() · viewPadding() · textScaleFactor() · orientation()` plus static `platform/mode`. This *is* the idiomatic MediaQuery replacement; per-context `MediaQuery` override semantics are out of scope. Accessibility flags (boldText/disableAnimations/highContrast) and `systemGestureInsets` are the only fields worth adding later.

### Solid reactivity — builders are not needed (⊘ "n/a-Solid")
Control flow and async/derived state live in JS. These Flutter widgets have **no reason to exist** as elements:
`FutureBuilder`→`createResource`+`Loading/Errored` · `StreamBuilder`→signal over async source · `ValueListenableBuilder`/`ListenableBuilder`/`AnimatedBuilder`→handle-listener→signal · `Builder`/`StatefulBuilder`→signals · `TweenAnimationBuilder`→JS-driven per-frame push.

## 3. Material / Cupertino decoupling — strategy

**Research summary.** Flutter is relocating `package:flutter/material.dart` and `cupertino.dart` out of the SDK into independent pub.dev packages (`material_ui` / `cupertino_ui`, both flutter.dev-verified, currently v0.0.1 "Coming soon"). Umbrella issue flutter/flutter#101479. Three phases: (1) **Reinforcement** of the core `widgets` layer with headless primitives — *active*; (2) **Relocation** (lift-and-shift to `flutter/packages`, real package publish) — *in progress, timed to a future stable cut*; (3) **Removal** from the SDK — *explicitly long-term, gated behind a long deprecation window*. As of stable 3.41 nothing is deprecated or removed. Speculative "3.44 deprecates material.dart" blog posts are **not supported by primary sources — disregard.**

**Why this is low-risk.** It is a *packaging move, not an API rewrite*. The team explicitly committed to **not breaking existing Material/Cupertino widget APIs** to extract primitives. The only near-term breaking change is the import path (`package:flutter/material.dart` → `package:material_ui/material_ui.dart`) — a one-line, centralized swap in the Dart builder layer, invisible to the JS/JSX surface.

**Recommendation — keep doing what you're doing.**
1. **Build Material/Cupertino widgets now against current SDK APIs.** You already shipped `TabBar`/`RefreshIndicator`/Cupertino slivers; the "fine implementing now, changing later" stance is correct.
2. **Isolate every `material.dart`/`cupertino.dart` import behind the Dart builder layer** so the eventual path swap is one localized edit. (This is the *one* discipline to enforce going forward.)
3. **Prefer the `widgets`-layer primitive when a real choice exists** — e.g. `RawScrollbar` over Material `Scrollbar`, pure `GestureDetector` over `InkWell` *where ripple isn't wanted*. Don't contort to avoid Material where the Material widget is the right tool (buttons, Scaffold, dialogs).
4. **Fix the mislabels:** `BouncingScrollPhysics` and `ClampingScrollPhysics` are in `widgets` (physics.dart), **not** cupertino/material — no decoupling risk. `AutofillHints`/`TextInputAction` are in `services` — not Material-coupled (the *field* is, the constants aren't).
5. Watch sub-issues #172932 (publish) and #172942 (deprecation) for the cut-over signal. **Do not block on this. Do not migrate imports early.**

Tables below tag Material/Cupertino items **⚠mat** / **⚠cup** to mean "decoupling-isolate the import," not "avoid."

---

## 4. Coverage tables by category

**Glyphs:** ✅ covered · 🟡 partial · 🟫 via-view · 🛰 via-host · ⊘ n/a (Solid/render-layer) · ❌ missing

### Layout
| Item | Status | Pri | Notes |
|---|---|---|---|
| Row/Column/Flex/Padding/Align/Center/SizedBox/AspectRatio/ConstrainedBox/Expanded/Flexible/Container/DecoratedBox | 🟫 | skip | Folded into `view` (§2). |
| Stack / Positioned | ✅ | skip | Full edge/size props + `fill`; Positioned slot-identity handled. No `Positioned.directional` (low). |
| **Wrap** | ❌ | **high** | Genuinely absent (no run-wrapping in `view.flex`). Chips/tags. Multi-child + WrapAlignment enums. **diff: low–med.** |
| **SafeArea** (box-level) | ❌ | **high** | Only `SliverSafeArea` ships; `host.padding()` gives raw insets. Near-mandatory for mobile. **diff: low.** |
| **FractionallySizedBox** | ❌ | med | No `widthFactor/heightFactor`; % sizing unavailable. Cheap. |
| **FittedBox** | ❌ | ~~high~~ **med** | *Critique: overrated as high.* Object-fit scaling absent (`transform.scale` is fixed-factor). Useful, not top-tier. |
| IntrinsicHeight / IntrinsicWidth | ❌ | med | Equal-height rows / menu sizing. Note O(N²) layout cost (could argue low). |
| Spacer | ❌ | med | *Critique: this is `missing`, not `partial`.* `flex.spacing` is fixed inter-child gap — **not** a flexible childless space-consumer. No equivalent exists. Trivial Flexible-backed element. |
| Offstage | ❌ | med | Keep-laid-out-but-unpainted (measure/keep-alive). `view.visible:false` → SizedBox.shrink (zero size), different semantics. Single bool. |
| Table / Flow / Custom*ChildLayout / LayoutId | ❌ | skip | Imperative Dart delegates / sealed unions; not JSON-bridgeable. |
| **LayoutBuilder** (box) | ❌ | med | Hardest common widget (sync-layout vs async-JS). Reuse `sliverLayoutBuilder` snapshot pattern. |
| UnconstrainedBox/LimitedBox/OverflowBox/Baseline/PositionedDirectional/FractionalTranslation | ❌ | low | Niche escape hatches / RTL. |
| EdgeInsets / Alignment / BoxConstraints decoders | 🟡 | med | Working for padding/margin/alignment; consolidate into one shared decoder + confirm `*Directional` coverage before adding new layout widgets. |

### Paint
| Item | Status | Pri | Notes |
|---|---|---|---|
| DecoratedBox/Opacity/ClipRect/ClipRRect/Transform.{rotate,scale,translate} | 🟫 | skip | `view` props. |
| **RepaintBoundary** | ❌ | ~~high~~ **low–med** | *Critique: overrated.* Pure perf/screenshot, no visible behavior. Trivial, but not app-author demand. |
| **AnimatedOpacity** (box) | ❌ | **high** | ~20-line clone of shipped `sliverAnimatedOpacity`. Extremely common fade. **diff: low.** |
| **AnimatedContainer** | ❌ | **high** | Flagship implicit animator; static surface already in `view`, work is tweening the JSON bag. **diff: med–high.** |
| **BackdropFilter** | ❌ | med | Frosted-glass; needs `ImageFilter` serializer (blur is the case) + clip bound. |
| ShaderMask | ❌ | med | Gradient fade-edges on lists; accept serialized Gradient, build shaderCallback Dart-side. |
| ColorFiltered / ColorFilter | 🟡 | med | `image.color`+blendMode covers `.mode`; no general matrix/gamma decoder to share. |
| ClipOval | ❌ | med | Circular avatars clipping arbitrary children. Cheap. |
| Transform (matrix/skew/origin) | 🟡 | med | `view` stacks separate layers; no raw Matrix4/perspective. Adds 3D + skew for free. |
| BoxDecoration / Gradient / Border / DecorationImage | 🟡 | med | Round out incrementally: sweep gradient + tileMode + GradientTransform; border strokeAlign/style; DecorationImage alignment/repeat/centerSlice/providers (reuse Image's provider detection). |
| ImageFilter | ❌ | med | Prerequisite value object for BackdropFilter/ImageFiltered; blur dominant. |
| RotatedBox / FractionalTranslation / BoxShadow.blurStyle / Clip.antiAliasWithSaveLayer / Porter-Duff BlendModes | 🟡/❌ | low | Small completeness gaps. |
| ShapeDecoration / ShapeBorder / CustomPaint / ClipPath / PhysicalModel | ❌ | low | Need polymorphic ShapeBorder serializer or draw-command DSL; high-cost, no current consumer. |
| **ColoredBox** | ❌ | — | *Critique add.* Cheap single-color paint; conceptually `view.decoration.color`. Note only. |
| **ModalBarrier** (non-animated) | ❌ | low | *Critique add.* Only `AnimatedModalBarrier` was enumerated; both route-machinery-internal. |

### Scroll
| Item | Status | Pri | Notes |
|---|---|---|---|
| SingleChildScrollView (`scrollView`) / CustomScrollView / NestedScrollView | ✅ | skip | Full prop set; only `center` GlobalKey absent. |
| ScrollPhysics presets (bouncing/clamping/always/never/page) | ✅ | skip | `Bouncing`/`Clamping` are **widgets-layer, not cup/mat** — decoupling tags were wrong. |
| **ListView / ListView.builder** | ❌ | **high** | **THE day-to-day gap.** No ergonomic lazy box-level list; `sliverList` is eager + verbose. **diff: med.** |
| **GridView / GridView.builder** | ❌ | **high** | Same; ship with ListView (sliverGrid has the math, not the ergonomics). |
| **PageView + PageController** | ❌ | **high** | Carousels/onboarding/swipe-tabs; no snap-scroller. Ship as one feature. **diff: med.** |
| **NotificationListener + ScrollNotification + ScrollMetrics** | ❌ | **high** | Highest-value reactive scroll capability: infinite-scroll/hide-on-scroll/parallax. `listener.signal` is pointer-wheel only. Throttled bridge. **diff: med.** |
| ScrollController (enrich) | 🟡 | med | Only `.offset` pushed; add maxScrollExtent/viewportDimension/atEdge/extentBefore-after + `ensureVisible` + configurable curve. Small, high-leverage. |
| RawScrollbar | ❌ | med | **Decoupling-safe** scrollbar (over Material `Scrollbar`); controller-sharing is the only wrinkle. |
| DraggableScrollableSheet + DraggableScrollableController | ❌ | med | Bottom-sheet-with-scroll; needs builder(ctx, ScrollController) threading. **Widgets-layer (no risk).** |
| RefreshIndicator | ✅ | skip | Shipped. ⚠mat (.adaptive → Cupertino spinner on iOS). |
| ListWheelScrollView / ScrollConfiguration / ScrollBehavior / overscroll indicators | ❌ | low | Niche or subclass-driven; surface curated knobs later. |

### Slivers — most complete category
| Item | Status | Notes |
|---|---|---|
| customScrollView, sliverList (+FixedExtent/PrototypeExtent), sliverGrid, sliverToBoxAdapter, sliverPadding, sliverFillRemaining, sliverFillViewport, decoratedSliver, sliverOpacity, **sliverAnimatedOpacity**, sliverIgnorePointer, sliverSafeArea, sliverPersistentHeader, pinnedHeaderSliver, sliverResizingHeader, sliverFloatingHeader, sliverMainAxisGroup, sliverCrossAxisGroup, sliverConstrainedCrossAxis, sliverCrossAxisExpanded, sliverLayoutBuilder, sliverOverlapAbsorber/Injector, sliverReorderableList (+2 drag listeners) | ✅ | All registered with correct lazy builder-delegate + keep-alive flags. |
| sliverAppBar / flexibleSpaceBar | ✅ ⚠mat | Largest sliver file; shipped, don't reinvest. |
| cupertinoSliverNavigationBar / cupertinoSliverRefreshControl | ✅ ⚠cup | Shipped. |
| **SliverVariedExtentList** | ❌ low | *Critique fix: the gap row was hallucinated as "SliverPrefixedExtentList" — no such class.* Real class = `SliverVariedExtentList` (per-index `itemExtentBuilder`); sync per-index callback awkward over async bridge, rare. |
| `.separated` separator slot (SliverList) | ❌ low | Only real list gap. |
| SliverAnimatedList/Grid | ❌ low | Imperative GlobalKey insert/remove clashes with reactive diffing; Solid `Show` substitutes. |
| SliverVisibility/SliverOffstage | ⊘ skip | Reactive conditional render supersedes. |

### Gestures
| Item | Status | Pri | Notes |
|---|---|---|---|
| gestureDetector / listener (+ all recognizers via callbacks) | ✅ | skip | Near-exhaustive, rich serialization. Pure widgets. |
| ignorePointer / absorbPointer | ✅ | skip | Standalone + `view` prop. |
| **MouseRegion + MouseCursor/SystemMouseCursors** | ❌ | **high** | No hover/cursor — essential desktop/web. onEnter/onExit/onHover + string→cursor map. Ship as one. **diff: med.** |
| **Draggable + DragTarget** | ❌ | **high** | Core DnD; multi-slot (feedback/childWhenDragging) + typed payload round-trip. `DragTarget.onWillAccept` sync-bool is the hard part → constrained accept-by-type. **diff: high.** |
| **Dismissible** | ❌ | **high** | Swipe-to-dismiss list; stable key + background slots + async `confirmDismiss`. **diff: high.** |
| **InteractiveViewer + TransformationController** | ❌ | **high** | Pinch-zoom/pan for images/maps; Matrix4↔float-array serialization. **diff: high.** |
| LongPressDraggable / DismissDirection | ❌ | med | Follow Draggable/Dismissible, inherit their bridging. |
| ForcePress / Raw recognizers / arena internals | ⊘ | skip | Not bridge targets. |

### Focus & keyboard
| Item | Status | Pri | Notes |
|---|---|---|---|
| FocusNode handle | 🟡 | **high** | Has focus/unfocus/hasFocus. Expand cheaply: hasPrimaryFocus, canRequestFocus/skipTraversal, next/previous/inDirection, unfocus disposition. |
| **Focus** (widget) | 🟡→❌ | **high** | No element to make arbitrary subtrees focusable / fire onFocusChange/autofocus. `Focus.withExternalFocusNode` + existing handle. ⚠ `onKeyEvent`'s sync `KeyEventResult` is the hard part. |
| **KeyboardListener** | ❌ | **high** | Best-fit first keyboard widget: **no sync return** → maps onto fire-and-forget callback model. Needs managed FocusNode (handle has it). **diff: med.** |
| **KeyEvent / LogicalKeyboardKey** | ❌ | **high** | Foundational value objects + name↔key lookup table. Trivial, load-bearing for every key feature. **diff: low.** |
| CallbackShortcuts + SingleActivator/ShortcutActivator | ❌ | med | Most bridge-friendly shortcuts: serialize `{key,ctrl,shift,alt,meta}`, back with plain JS callback, bypass Intent/Action. ⚠ sync activator matching. |
| HardwareKeyboard (read-only state) | ❌ | med | Modifier/pressed-key state → host namespace pattern. |
| KeyEventResult | ❌ | med | Trivial enum but the crux: sync return the async channel can't do → `Focus.onKeyEvent` needs a pre-declared/defaulted result strategy. |
| FocusScope / FocusTraversalGroup / PhysicalKeyboardKey | ❌ | med | Modal confinement / Tab-order / position-based input. |
| Shortcuts/Actions/Intent/ActionDispatcher/Registry | ⊘ | skip | Type-keyed Intent→Action indirection redundant once CallbackShortcuts routes to JS. |
| autofillHints / TextInputAction | ✅ | skip | *Critique: these are `services`-layer, NOT Material — drop the ⚠mat tag.* |

### Text
| Item | Status | Pri | Notes |
|---|---|---|---|
| Text / Text.rich / TextSpan | ✅ | skip | Auto-upgrade to rich; recognizer lifecycle. |
| TextAlign/Direction/Overflow/Capitalization/FontWeight/FontStyle/Shadow | ✅ | skip | Full enums. |
| **DefaultTextStyle** | ❌ | **high** | The **non-Material** text-theming primitive: one style prop + child slot. No ambient-style inheritance today. **diff: low.** |
| **TextEditingController** (handle) | ❌ | **high** | `textField` owns one internally (controlled `value`); no handle to read/set text/selection. Most-requested text handle; fits `createHandle`. Ships with TextEditingValue/TextSelection/TextRange. **diff: high.** |
| TextStyle (fill gaps) | 🟡 | med | Add cheap JSON fields: fontFamilyFallback, decorationThickness, textBaseline, leadingDistribution, fontFeatures/fontVariations. |
| TextScaler (plain Text) | 🟡 | med | Works only on rich path; wire onto plain Text incl. `noScaling`. Accessibility win. |
| TextInputType / TextInputAction (widen) | 🟡 | med | Add datetime/visiblePassword/name/none + previous/continue/etc. Cheap form value. |
| SelectionArea | ❌ | med ⚠mat | Make descendant Text selectable as one block. `SelectionArea`+Text is the modern path over SelectableText. |
| Clipboard / ClipboardData | ❌ | med | Async get/set/hasStrings over existing channels. Copy buttons. |
| WidgetSpan baseline / TextBaseline | 🟡 | low | *Critique: one limitation (hardcoded alphabetic) was double-counted as two partial rows.* |
| StrutStyle/TextHeightBehavior/TextWidthBasis/FontFeature/FontVariation/Locale.scriptCode | 🟡/❌ | low | Cheap JSON, niche typography. |
| SelectableText/EditableText/TextFormField/CupertinoTextField | ❌ | low | Material/Cupertino or superseded by SelectionArea/Solid forms. |

### Structure / async / a11y / navigation
| Item | Status | Pri | Notes |
|---|---|---|---|
| MediaQuery(Data) | 🛰 | skip | host namespace (§2). Add a11y flags later (low). |
| FutureBuilder/StreamBuilder/*ListenableBuilder/Builder/StatefulBuilder | ⊘ | skip | Solid (§2). |
| Navigator / NavigatorState / Route / Page / MaterialPageRoute | ✅ | skip | Declarative pages API via JS NavigationController. ⚠mat (materialPage). |
| **PopScope** | 🟡 | **high** | Navigator forwards system pops via onDidRemovePage, but no per-subtree `canPop`/`onPopInvoked` veto for confirm-before-leave. **diff: med.** |
| **Semantics** | ❌ | ~~med~~ **high** | *Critique: underrated given ZERO a11y coverage exists.* JSON label/value/hint/flags easy; action callbacks (onTap/onIncrease/onSetText) as JS fns are the real build. The keystone of the entire absent a11y surface. **diff: high.** |
| Directionality | ❌ | med | RTL/i18n; asserted by many layout widgets; no `*App` providing it. Cheap. |
| DefaultTextStyle/DefaultTextHeightBehavior/IconTheme | ❌ | med | Pure widgets-layer ambient-style InheritedWidgets; JSON props + child. Theming without Material. |
| OverlayPortal + OverlayPortalController | ❌ | med | Declarative reactive-friendly floating UI (overlay child = JSX slot). Needs vended controller handle. Strategic overlay target over raw Overlay. |
| Tooltip | ❌ | med ⚠mat | Desktop/web; mostly JSON props. Material-only. |
| PageRouteBuilder | ❌ | med | Platform-neutral custom-transition route — avoids mat/cup lock-in for nav transitions; exposing Animation to JS is the hard part. |
| showDialog/showModalBottomSheet helpers (Future→Promise) | ❌ | high ⚠mat | See Material — the imperative `builder→Future→JS-promise` bridge is the load-bearing primitive. |
| MergeSemantics/ExcludeSemantics | ❌ | low | Pair with Semantics. |
| Overlay/OverlayEntry/ModalRoute/CupertinoPageRoute/NavigatorObserver | ❌ | low | Imperative lifecycle or niche. |
| Router/RouterDelegate/RouteInformation* / Localizations / Restoration | ⊘ | skip | JS router + JS i18n + JS-persisted state replace these. |

### Implicit animation
| Item | Status | Pri | Notes |
|---|---|---|---|
| sliverAnimatedOpacity | ✅ | skip | Proves the pattern (`onEnd` callback plumbing exists, reusable for free). |
| **AnimatedOpacity** | ❌ | **high** | ~20-line clone. **diff: low.** |
| **AnimatedContainer** | ❌ | **high** | Flagship; tween the existing `view` JSON bag. **diff: med–high.** |
| **AnimatedSize** | ❌ | **high** | Canonical expand/collapse/reveal — layout-measured, no target value to bridge (child + timing). Solid child-swaps can't animate themselves. **diff: med.** |
| **AnimatedSwitcher** | ❌ | **high** | Loading→content cross-fade Solid's instant swap can't smooth. Hard: key-based swap detection across bridge + transition *presets* (fade/slide/scale/size) not closures. **diff: high.** |
| AnimatedAlign/Padding/Scale/Rotation/Slide | ❌ | med | Cheap single-value tweens mirroring shipped pattern; chevron flips, slide-in panels. **diff: low.** |
| AnimatedPositioned | ❌ | med | Stack child supported; over-constraint validation needs care. |
| AnimatedDefaultTextStyle | ❌ | med | Needs DefaultTextStyle base first (which doesn't exist). |
| AnimatedList/Grid (+Sliver) | ❌ | low–med | Imperative GlobalKey insert/remove vs declarative diffing; threads Dart Animation into JS items. |
| Curve (parametric) | 🟡 | med | ~16 named curves mapped; add `Cubic(a,b,c,d)` + `Interval`. Low-effort, amplifies CurvedAnimation. |
| AnimatedCrossFade/FractionallySizedBox/PhysicalModel/Theme | ❌/⊘ | low–skip | Superseded or no ThemeData to lerp. |

### Explicit animation — keystone category
| Item | Status | Pri | Notes |
|---|---|---|---|
| TickerProvider | ✅ | skip | `tabController` handle already implements it (`createTicker`→Ticker). **The vsync/bridging problem is solved.** |
| Duration | ✅ | skip | ms-as-int convention. |
| **AnimationController** | ❌ | **HIGHEST** | The keystone. `createHandle`+RPC + existing TickerProvider pattern = the hard part is done. Single highest-leverage build in the whole map. **diff: high.** |
| **Animation + AnimationStatus** | ❌ | **high** | value+status pushed to JS, kept mostly Dart-side; every transition consumes it. Status = trivial string enum. |
| **Tween** | ❌ | **high** | Turns 0..1 into typed values; enumerate typed subclasses `{begin,end}`. Required beyond plain opacity. **diff: med.** |
| **CurvedAnimation** | ❌ | **high** | Curve-name parsing already exists → half-built. Standard easing primitive. |
| **FadeTransition / ScaleTransition / SlideTransition** | ❌ | **high** | Cheapest render-layer transitions; first to ship once Animation handle lands. Slide needs `Animation<Offset>` from `Tween<Offset>`. **diff: low.** |
| SizeTransition / RotationTransition / PositionedTransition / DecoratedBoxTransition | ❌ | med | Same batch; DecoratedBoxTransition reuses the existing BoxDecoration parser. |
| TickerFuture | ❌ | med | Model `forward()/reverse()` as JS Promises (resolve on done / reject on `orCancel`). Idiomatic chaining. |
| TweenSequence / Simulation (spring/fling) / AnimationBehavior | ❌ | med | Keyframes / physics / reduced-motion. After core. |
| Animatable / Curve(parametric) | 🟡/❌ | med | Expose concrete Tween subclasses only (no arbitrary JS transform callbacks → avoids per-frame bridge cost). |
| AnimatedBuilder/ListenableBuilder | ⊘ | skip | Push Animation value → Solid signal, rebuild in JS. Per-frame builder over the bridge is the anti-pattern. |
| Hero | ❌ | med | *Critique fix: the declarative `pages`-mode Navigator IS a real Navigator and DOES support Hero* — it is **not** blocked by "not vanilla Navigator." Still hard (frame-coupled flight across two JS subtrees + flightShuttle); defer until controller/transition core lands. |
| TickerMode | ❌ | low | *Critique add.* Pause offscreen animations; fold into controller later. |

### Material (⚠ isolate imports per §3)
| Item | Status | Pri | Notes |
|---|---|---|---|
| TabBar/TabBarView/Tab/TabController/DefaultTabController | ✅ | skip | Shipped, thorough. |
| SliverAppBar/FlexibleSpaceBar/RefreshIndicator | ✅ | skip | Shipped. |
| **ElevatedButton/FilledButton/OutlinedButton/TextButton/IconButton/FAB** | ❌ | **high** | **Most-requested missing surface.** Shared `ButtonStyle/styleFrom` bridge across the family — build once. FAB must manage `heroTag`. **diff: med.** |
| **Material + InkWell** | ❌ | **high** | `gestureDetector` has NO ripple → genuine gap. `Material` ancestor (elevation/shape/ink) + InkWell tap feedback. Build together; prerequisite for buttons' ink. **diff: low/med.** |
| **Scaffold + AppBar** | ❌ | **high** | Page skeleton + plain (non-scrolling) top bar. Pure slot bridging. SnackBar host. **diff: med.** |
| **NavigationBar** | ❌ | **high** | M3 bottom nav (structured destinations + selectedIndex/callback). Build before BottomNavigationBar (M2, optional). |
| **Switch / Checkbox / Slider** | ❌ | **high** | Controlled inputs round-trip cleanly to Solid signals. Throttle Slider onChanged. **diff: low.** |
| **CircularProgressIndicator / LinearProgressIndicator** | ❌ | **high** | Pure JSON, no callbacks. Ubiquitous loading. **diff: low.** |
| **ListTile** | ❌ | **high** | Workhorse settings/list row (leading/title/subtitle/trailing + onTap) + tile variants. Tedious to fake with `view`. **diff: med.** |
| **AlertDialog + showDialog** | ❌ | **high** | `builder→Future→JS-promise` is **the load-bearing primitive** reused by sheets/pickers/menus. **diff: high.** |
| **showModalBottomSheet** | ❌ | **high** | Shares the show bridge; isScrollControlled keyboard handling. |
| **SnackBar** | ❌ | **high** | Needs ScaffoldMessenger handle + queue lifecycle → depends on Scaffold. |
| **Divider** | ❌ | **high** | Trivial, very frequent. Cheap win. |
| **Theme / ThemeData / ColorScheme** | ❌ | **high** | `ColorScheme.fromSeed(seed,brightness)` = best-ROI theming lever (`host.brightness` already supplies brightness). `Theme` is what every Material widget reads. ThemeData: prioritize `colorScheme + useMaterial3 + textTheme` subset, grow incrementally. |
| **ButtonStyle / WidgetStateProperty** | ❌ | **high** | State-dependent styling under the whole button/control family; flat `styleFrom` + optional per-WidgetState maps. |
| ~~**MaterialApp**~~ | ❌ | ~~high~~ **med** | *Critique: architectural mismatch.* solid-fuse owns nav via its own Navigator + boots through FuseView. The high-value pieces are **Material + Theme + ColorScheme**, not the app shell. Thin host for Material-localizations/ancestor only. |
| Card / Chip family / ExpansionTile / Drawer / NavigationRail / DropdownButton / PopupMenuButton / RangeSlider / Radio / SegmentedButton | ❌ | med | Common but second-wave. Radio: note `RadioGroup` ancestor is the modern API (value/groupValue on Radio deprecating). |
| TextTheme / per-component themes / WidgetState enums | ❌ | med | Grow theming incrementally as components land. |
| showDatePicker/showTimePicker | ❌ | med | Future<DateTime?> (ISO) over showDialog bridge. |
| Icon / Icons | ✅/⊘ | skip | `icon` element (code-point IconData, no risk); catalog is userland (@solid-fuse/lucide). |
| Stepper/DataTable/Menu*/Search*/Autocomplete/Form | ❌ | low–skip | Heavy structured/imperative; validation belongs in Solid. |
| CircleAvatar/Badge/CardHeader | ❌ | low | Composable with view/stack today. |

### Cupertino (⚠ isolate imports per §3)
| Item | Status | Pri | Notes |
|---|---|---|---|
| cupertinoSliverNavigationBar / cupertinoSliverRefreshControl | ✅ | skip | Shipped. |
| CupertinoIcons | ✅ | skip | Generated `cupertino.ts` (1335 IconData) + font ship. |
| **CupertinoButton** | ❌ | ~~high~~ **med** | Most common iOS control (press-fade, child+onPressed). *Critique: staking "high" on a moving library is risky → med unless iOS-fidelity is a hard target.* **diff: low.** |
| **CupertinoSwitch / CupertinoActivityIndicator** | ❌ | ~~high~~ **med** | Trivial bridges; activity indicator is the *only* spinner of any kind today. Demote to med per decoupling-risk dispute. |
| CupertinoPageScaffold + CupertinoNavigationBar | ❌ | med | iOS page layout (nav over body); compose manually today. |
| CupertinoColors | ❌ | med | Static iOS palette; cheap named-constant JS export (mirror cupertino.ts icons). `parseColor` only does ARGB/hex. |
| showCupertinoDialog / showCupertinoModalPopup + AlertDialog/ActionSheet/DialogAction | ❌ | med | Same imperative show bridge as Material dialogs; ship as a unit. |
| CupertinoSlidingSegmentedControl / CupertinoListSection+ListTile / CupertinoSlider / CupertinoCheckbox | ❌ | med | Signature iOS layouts/controls; keyed-map-of-slots bridge is the cost. |
| CupertinoPageRoute (cupertinoPage handle) | 🟡 | low | Routing works via materialPage (Material transition only); iOS slide + edge-swipe-back missing. |
| CupertinoTextField / SearchTextField / Picker / DatePicker / TabScaffold | ❌ | low | Stateful-controller + wheel/FixedExtentScrollController; port after base primitives. |
| CupertinoTheme(Data) / DynamicColor / ContextMenu / FormSection | ❌ | low | Theme provider + adaptive colors; defer. |
| CupertinoMagnifier/SelectionToolbar/TimerPicker | ⊘ | skip | Defaults are automatic; selection-state builders don't round-trip. |

---

## 5. Prioritized roadmap

Ordered for impact. Difficulty: **(S)**mall / **(M)**edium / **(L)**arge.

### Tier 1 — high-impact, framework-core, zero/low decoupling risk
Build these first; they unblock the most and touch only `widgets`/foundation.

1. **AnimationController + Animation + AnimationStatus + Tween + CurvedAnimation** **(L)** — *the keystone.* Vsync already solved by the tab handle; everything explicit-anim depends on it. **Ship FadeTransition/ScaleTransition/SlideTransition (S) in the same batch** as proof + immediate payoff.
2. **ListView.builder / GridView.builder** **(M)** — closes the biggest *ergonomic* gap; lazy `itemBuilder` over the existing sliver delegate.
3. **AnimatedContainer + AnimatedOpacity + AnimatedSize** **(S–M)** — implicit-anim covers most app motion without per-frame JS pushes; AnimatedOpacity is a ~20-line clone of the shipped sliver one.
4. **SafeArea (box) + Wrap** **(S)** — both near-mandatory mobile/layout staples, both trivial.
5. **MouseRegion + MouseCursor** **(M)** — unblocks all desktop/web hover.
6. **NotificationListener + ScrollNotification + enriched ScrollController** **(M)** — the reactive scroll story (infinite-scroll/parallax/hide-on-scroll); enrich the controller's metrics + `ensureVisible` alongside.
7. **PageView + PageController** **(M)** — carousels/onboarding/swipe-tabs as one feature.
8. **KeyEvent + LogicalKeyboardKey + KeyboardListener + Focus (widget) + expanded FocusNode** **(S–M)** — KeyboardListener has no sync return so it fits the callback model cleanly; the rest is the focusable-subtree foundation. (`Focus.onKeyEvent`'s sync `KeyEventResult` needs a defaulted-result strategy — design that explicitly.)
9. **DefaultTextStyle + Directionality + IconTheme** **(S)** — ambient theming without Material; Directionality is asserted by many widgets and nothing provides it.
10. **TextEditingController handle (+ TextEditingValue/TextSelection)** **(L)** — most-requested text handle; programmatic read/set of text + selection.
11. **Draggable + DragTarget + Dismissible + InteractiveViewer (+ TransformationController)** **(L)** — DnD/swipe/zoom; high difficulty each but high real-world demand.
12. **Semantics (+ Merge/ExcludeSemantics)** **(L)** — the entire a11y surface is currently zero; this is the keystone for any accessibility-serious consumer.

### Tier 2 — Material core (⚠ isolate imports; build now per §3)
The "design system" tier. One shared bridge unlocks a family.

1. **Material + InkWell** **(S–M)** — ink/ripple ancestor; prerequisite for ink on buttons.
2. **Button family** (Elevated/Filled/Outlined/Text/Icon/FAB) + **ButtonStyle/WidgetStateProperty** **(M)** — the most-requested missing surface; one ButtonStyle bridge serves all.
3. **Theme + ColorScheme.fromSeed + ThemeData(subset)** **(M)** — best-ROI theming; `host.brightness` already supplies the brightness input.
4. **Scaffold + AppBar + NavigationBar + Divider** **(M)** — the page skeleton + bottom nav + the trivial-but-ubiquitous rule.
5. **Switch / Checkbox / Slider / CircularProgressIndicator / LinearProgressIndicator** **(S)** — controlled inputs → Solid signals; spinners are pure JSON.
6. **ListTile** **(M)** + tile variants.
7. **showDialog / showModalBottomSheet (+ AlertDialog) + SnackBar** **(L)** — the `builder→Future→JS-Promise` imperative bridge is itself the strategic primitive (reused by every overlay/picker). SnackBar needs a ScaffoldMessenger handle.
8. **OverlayPortal + OverlayPortalController** **(L)** — declarative floating UI; the reactive-friendly overlay substrate.

### Tier 3 — medium value / second-wave
RawScrollbar · DraggableScrollableSheet · SelectionArea · Clipboard · BackdropFilter (+ ImageFilter) · ShaderMask · ColorFiltered · ClipOval · Transform-matrix escape hatch · CallbackShortcuts/SingleActivator/HardwareKeyboard · PopScope · PageRouteBuilder · FractionallySizedBox · LayoutBuilder (box) · Tooltip · Card/Chip family/ExpansionTile/Drawer/Radio(RadioGroup)/DropdownButton/PopupMenuButton/RangeSlider/SegmentedButton · DatePicker/TimePicker · remaining implicit-anim (Align/Padding/Scale/Rotation/Slide/Positioned) · TweenSequence/Simulation/TickerFuture · Cupertino core (Button/Switch/ActivityIndicator/PageScaffold/NavBar/Colors/dialogs) · BoxDecoration/Gradient/Border completeness · TextStyle/TextScaler/TextInputType widening.

### Skip / defer (do not build)
- **Imperative-delegate widgets:** Table/Flow/Custom*ChildLayout/LayoutId, CustomPaint/Painter, ClipPath, ShapeBorder/ShapeDecoration (no consumer), DataTable/PaginatedDataTable.
- **Render-layer:** RenderBox/RenderSliver/Viewport/Scrollable — bridge is Widget-level by design.
- **Solid-replaced:** all `*Builder`/`FutureBuilder`/`StreamBuilder`/`TweenAnimationBuilder`, Form/FormField (validation → Solid), Router/RouterDelegate/RouteInformation*, Localizations, Restoration.
- **Intent/Action indirection** (use CallbackShortcuts), RawGestureDetector, ShortcutRegistry/Manager.
- **Deprecated:** RawKeyboardListener/RawKeyboard (→ KeyboardListener/HardwareKeyboard), WillPopScope (→ PopScope).
- **Cupertino long tail:** TimerPicker, ContextMenu, SheetRoute, magnifier/selection toolbars, FormFieldRow.
- **MaterialApp** as a full shell (architectural mismatch — see §4 Material).

---

## 6. The single most strategically important missing capability

**`AnimationController` (with `Animation`/`Tween`/`CurvedAnimation` and the first three `*Transition` widgets).**

Why it outranks even ListView.builder and Material buttons:

- **It is the one true unlock, not a leaf.** ListView.builder and buttons are self-contained additions. AnimationController is the root that the *entire* explicit-animation category, half the polish layer, and eventually Hero/route transitions all hang off. Nothing else in the map gates as much downstream work.
- **The expensive, scary part is already proven.** The hard problem — vsync/Ticker bridging for an object that lives *outside* the widget tree — is already solved in production: the `tabController` handle implements `TickerProvider` and drives a bare `Ticker`. The bridge already sustains per-frame pushes at 60fps. AnimationController is "repeat the tab handle's vsync trick + add a Tween RPC surface," not net-new research.
- **It closes the model's one true blind spot.** Solid reactivity elegantly subsumes async/derived state, control flow, and per-frame *JS-driven* animation — but it cannot make a *child swap* tween, cannot ease a value Dart-side, cannot resolve a `forward()` as a Promise. AnimationController + TickerFuture is the missing reactive-to-imperative seam that lets JS *kick off* a Dart-owned animation and await it, which is the natural division of labor (frame-perfect phase coupling stays Dart-side, orchestration stays JS-side).

Build the controller, ship Fade/Scale/Slide with it, and the implicit-anim tier becomes incremental rather than foundational.