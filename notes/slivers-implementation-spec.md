# Sliver suite — implementation spec

Build contract for the complete sliver/scrolling surface in solid-fuse. Derived from
`api.flutter.dev` (current stable) + the existing widget/handle patterns. Read this
together with an existing analogous widget (`src/widgets/scroll-view.tsx`,
`dart/lib/src/widgets/scroll_view.dart`, `view.dart`) before implementing.

## Conventions (recap)

- **JS:** `src/widgets/<kebab>.tsx` → `interface XProps extends BaseProps { ... }` +
  `export function X(props: XProps) { return <x {...props} />; }`. Shared input types in
  `src/types.ts`. Public export in `src/index.ts`. Enums = string unions. Flutter names, not DOM.
- **Dart:** `dart/lib/src/widgets/<snake>.dart` → `class FuseX extends StatelessWidget { const FuseX(this.node); final FuseNode node; ... }`.
  Register `runtime.registerWidget('x', FuseX.new)` in `solid_fuse_package.dart`.
- **Prop accessors:** `node.double/int/bool/string/list<T>/map`,
  `node.color/edgeInsets/borderRadius/boxDecoration/alignment/clipBehavior/fontWeight/offset`,
  `node.handle<T>('controller')`, `node.callback('onX')`, `node.widget('slot')`,
  `node.childWidgets` (List<Widget>), `node.flexChildren` (Widget). Parsers live in `utils.dart`.
- **Sliver pass-through:** `FuseNodeWidget`/`ListenableBuilder` are component widgets, so a builder
  returning a *sliver* is valid wherever a sliver is expected. `CustomScrollView(slivers: node.childWidgets)`
  works as long as each child's builder returns a sliver.

## Architectural rule for lists

Every list/grid wraps the **eager** `node.children` in a lazy `SliverChildBuilderDelegate`
(NOT `SliverChildListDelegate`) so Flutter inflates only the visible window. Children are
keyed by the existing `ValueKey(node.id)`; a `findChildIndexCallback` preserves identity on
reorder/insert. See `fuseSliverChildDelegate` below. No renderer rewrite; pagination caps N
at the data layer; windowing is a future userland recipe (see memory `list-materialization-strategy`).

---

## Stage 0 — shared scaffolding (must land + verify before widgets)

### C. Array-of-nodes props (`actions`, multi-widget slots)
- **`src/renderer.ts` `setProperty`** — add an `Array.isArray(value)` branch (before the node-ref
  branch): store the raw array on `node.props[name]`, push a `setProp` op whose value is the array
  with each element that is a `FuseNode`/`{node}` mapped to `{ _node: id }`, others passed through.
- **`dart/lib/src/runtime.dart` `applyOps` `setProp`** — when `value is List`, map each element:
  `{_node:id}` → `registry.get(id)` (a FuseNode), else keep. Assign the resolved list. (No per-element
  subtree cleanup — orphan prop-nodes are disposed via their own `dispose` ops.)
- **`dart/lib/src/node.dart`** — add
  `List<Widget>? widgetList(String name) { final v = props[name]; if (v is! List) return null; return v.whereType<FuseNode>().map((n) => FuseNodeWidget(node: n)).toList(); }`

### D. Awaitable callbacks (pull-to-refresh)
- **`src/renderer.ts`** — register a second dispatch channel:
  `on("_functionCallAsync", (d) => handlers.get(`${d.nodeId}:${d.name}`)?.(d.value))` — note it
  **returns** the handler result (a Promise is fine; the channel `call` path awaits it). Keep the
  existing fire-and-forget `_functionCall` untouched (hot path: taps, 60fps scroll offset).
- **`dart/lib/src/runtime.dart`** — add `Future<dynamic> callFunctionAsync(int nodeId, String name, [dynamic value]) => channels.call('_functionCallAsync', {'nodeId': nodeId, 'name': name, 'value': value})` and wire a `callFunctionAsync` closure into each `FuseNode` (mirror how `callFunction` is wired in `registry.create`/the node constructor).
- **`dart/lib/src/node.dart`** — add
  `Future<dynamic> Function([dynamic value])? asyncCallback(String name) { if (props[name] != true) return null; return ([value]) => callFunctionAsync(id, name, value); }`

### E. `parseCurve` in `utils.dart`
`Curve parseCurve(String? v)` switch over: `linear, ease, easeIn, easeOut, easeInOut, easeInOutCubic,
fastOutSlowIn, decelerate, bounceIn, bounceOut, bounceInOut, elasticIn, elasticOut, elasticInOut`
→ matching `Curves.*`, default `Curves.linear`. Add `node.curve(key)` accessor on FuseMap.

### Sliver support helpers — `dart/lib/src/widgets/sliver_support.dart`
- `SliverChildBuilderDelegate fuseSliverChildDelegate(FuseNode node, {bool addAutomaticKeepAlives = true, bool addRepaintBoundaries = true, bool addSemanticIndexes = true})` — builder `(_, i) => FuseNodeWidget(node: node.children[i])`, `childCount: node.children.length`, `findChildIndexCallback` resolving `ValueKey<int>` → index by `node.id`. Respect the three keep-alive flags from props (`node.bool('addAutomaticKeepAlives') ?? true`, etc.) at the call sites.
- `SliverGridDelegate fuseGridDelegate(FuseNode node)` — if `maxCrossAxisExtent` present →
  `SliverGridDelegateWithMaxCrossAxisExtent`, else `SliverGridDelegateWithFixedCrossAxisCount`
  (`crossAxisCount ?? 2`). Common: `mainAxisSpacing ?? 0`, `crossAxisSpacing ?? 0`,
  `childAspectRatio ?? 1.0`, `mainAxisExtent`.
- `Widget? onlyChild(FuseNode node)` — `node.children.isEmpty ? null : FuseNodeWidget(node: node.children.first)` (the inner sliver for single-child sliver wrappers).

### Builder-via-signal pattern (for PersistentHeader / LayoutBuilder / NestedScrollView header)
JS wrapper owns a `createSignal` for the Dart-pushed value; registers a callback prop that calls
`setX`; renders a reactive child `{() => props.children(signal())}`. Dart side reads the current
child via `onlyChild(node)`/`node.childWidgets` and pushes the live value each build through
`node.callback('onLayout')?.call({...})`. Accepts ~1-frame lag (phase-coupling note). Example
wrapper shape is in the per-widget sections.

---

## Stage 1 — widgets

Legend: **slot** = single JSX node prop (read via `node.widget('slot')`); **children** = eager
JSX children; **builder** = function child via the signal pattern. All enums are string unions.

### Hosts

**`<CustomScrollView>`** → `dart/widgets/sliver_scroll_view.dart` `FuseCustomScrollView`
- children = slivers. Props mirror `scroll-view.tsx`: `scrollDirection 'vertical'|'horizontal'`,
  `reverse`, `controller` (ScrollController handle), `primary`, `physics 'bouncing'|'clamping'|'always'|'never'|'page'`,
  `shrinkWrap`, `anchor:number`, `cacheExtent:number`, `clipBehavior`, `keyboardDismissBehavior 'manual'|'onDrag'`,
  `dragStartBehavior 'start'|'down'`, `hitTestBehavior`, `restorationId`,
  `paintOrder 'firstIsTop'|'lastIsTop'` (guard if unsupported on SDK — wrap in try/version note; safe to omit if it doesn't compile).
- Dart: `CustomScrollView(slivers: node.childWidgets, ...)`, reuse scroll_view.dart's physics/clip/axis switches.

**`<NestedScrollView>`** → `FuseNestedScrollView` (advanced)
- Props: `header` = **builder** `(innerBoxIsScrolled: boolean) => slivers`, `body` = slot,
  `controller`, `scrollDirection`, `reverse`, `floatHeaderSlivers:boolean`.
- Dart: `NestedScrollView(headerSliverBuilder: (ctx, innerBoxIsScrolled) { push innerBoxIsScrolled to JS via node.callback('onHeader'); return [ ...node.widgetList('headerSlivers') or the rendered header children ]; }, body: node.widget('body'))`.
  The header builder result is a list of slivers — render via the signal pattern (JS produces the header
  slivers reactively into a sub-node whose `childWidgets` the Dart side reads). Own a
  `SliverOverlapAbsorberHandle` and expose it to descendant absorber/injector via an inherited widget.
- JS wrapper owns the `innerBoxIsScrolled` signal; `header={(scrolled) => <>...</>}`.

**`<SliverOverlapAbsorber>` / `<SliverOverlapInjector>`** → `FuseSliverOverlapAbsorber/Injector`
- Absorber: single sliver child; wraps `SliverOverlapAbsorber(handle: <from inherited NestedScrollView>, sliver: onlyChild(node))`.
- Injector: usually self-closing; `SliverOverlapInjector(handle: <inherited>)`.
- Handle resolved Dart-side from the enclosing NestedScrollView's inherited handle — **not** threaded through JS.

### Lists & grids

**`<SliverList>`** → `FuseSliverList`
- children = rows. Optional: `itemExtent:number` (→ `SliverFixedExtentList`), `prototypeItem:slot`
  (→ `SliverPrototypeExtentList`), `addAutomaticKeepAlives/addRepaintBoundaries/addSemanticIndexes:boolean`.
- Dart: if `itemExtent` → `SliverFixedExtentList(itemExtent: e, delegate: fuseSliverChildDelegate(node))`;
  elif `prototypeItem` → `SliverPrototypeExtentList(prototypeItem: node.widget('prototypeItem')!, delegate: ...)`;
  else `SliverList(delegate: fuseSliverChildDelegate(node))`.
- **Do NOT** add `itemExtentBuilder` (sync-per-index JS impossible on async bridge — omitted on purpose).

**`<SliverGrid>`** → `FuseSliverGrid`
- children = cells. Props: `crossAxisCount:number` XOR `maxCrossAxisExtent:number`,
  `mainAxisSpacing`, `crossAxisSpacing`, `childAspectRatio`, `mainAxisExtent`, keep-alive flags.
- Dart: `SliverGrid(gridDelegate: fuseGridDelegate(node), delegate: fuseSliverChildDelegate(node))`.

### Headers

**`<SliverAppBar>`** → `FuseSliverAppBar` (material)
- Slots: `leading`, `title`, `flexibleSpace`, `bottom`; **`actions`: JSX[]** (uses `node.widgetList`).
- Bools: `pinned, floating, snap, stretch, forceElevated, primary, centerTitle, automaticallyImplyLeading, excludeHeaderSemantics`.
- Numbers: `elevation, scrolledUnderElevation, expandedHeight, collapsedHeight, toolbarHeight, titleSpacing, stretchTriggerOffset, leadingWidth, bottomOpacity`.
- Colors: `backgroundColor, foregroundColor, shadowColor, surfaceTintColor`.
- `type 'small'|'medium'|'large'` (→ `SliverAppBar` / `.medium` / `.large`), `systemOverlayStyle 'light'|'dark'`,
  `clipBehavior`, `onStretchTrigger` (async callback → `node.asyncCallback`).
- All collapse behavior declarative — no shrinkOffset handle.

**`<FlexibleSpaceBar>`** → `FuseFlexibleSpaceBar` (slot of SliverAppBar.flexibleSpace)
- Slots: `title`, `background`. `centerTitle:boolean`, `titlePadding:EdgeInsets`, `expandedTitleScale:number`,
  `collapseMode 'none'|'pin'|'parallax'`, `stretchModes: ('zoomBackground'|'blurBackground'|'fadeTitle')[]`.

**`<SliverPersistentHeader>`** → `FuseSliverPersistentHeader` (builder/signal)
- Props: `pinned`, `floating`, `minExtent:number`, `maxExtent:number`,
  children = **builder** `(shrinkOffset:number, overlapsContent:boolean) => JSX`.
- Dart: `SliverPersistentHeader(pinned:, floating:, delegate: _FuseHeaderDelegate(node, minExtent, maxExtent))`.
  Delegate `build(ctx, shrinkOffset, overlapsContent)`: `node.callback('onLayout')?.call({'shrinkOffset': shrinkOffset, 'overlapsContent': overlapsContent}); return onlyChild(node) ?? const SizedBox();`
  `shouldRebuild` → true on extent/identity change.
- JS wrapper: signal `{shrinkOffset, overlapsContent}`, `onLayout` prop sets it, child `{() => props.children(s().shrinkOffset, s().overlapsContent)}`.

**`<PinnedHeaderSliver>`** → `FusePinnedHeaderSliver` — single child; `PinnedHeaderSliver(child: node.flexChildren)`. (Flutter ≥3.24.)

**`<SliverResizingHeader>`** → `FuseSliverResizingHeader` — `child` + optional `minExtent`/`maxExtent`
numbers → synthesize `SizedBox` prototypes; `SliverResizingHeader(minExtentPrototype:, maxExtentPrototype:, child: node.flexChildren)`. (≥3.24.)

**`<SliverFloatingHeader>`** → `FuseSliverFloatingHeader` — single child; optional
`animationStyle {duration:number(ms), curve:string}` (→ `AnimationStyle`), `snapMode 'overlay'|'scroll'` (≥3.27, guard). (≥3.24.)

### Layout / group

**`<SliverToBoxAdapter>`** — `SliverToBoxAdapter(child: node.flexChildren)`.
**`<SliverPadding>`** — `padding:EdgeInsets`; `SliverPadding(padding: node.edgeInsets('padding')!, sliver: onlyChild(node))`.
**`<SliverFillRemaining>`** — `hasScrollBody:boolean=true`, `fillOverscroll:boolean=false`, child = box; `SliverFillRemaining(hasScrollBody:, fillOverscroll:, child: node.flexChildren)`.
**`<SliverFillViewport>`** — children; `viewportFraction:number=1`, `padEnds:boolean=true`; `SliverFillViewport(viewportFraction:, padEnds:, delegate: fuseSliverChildDelegate(node))`.
**`<SliverMainAxisGroup>`** — children = slivers; `SliverMainAxisGroup(slivers: node.childWidgets)`.
**`<SliverCrossAxisGroup>`** — children = slivers; `SliverCrossAxisGroup(slivers: node.childWidgets)`.
**`<SliverConstrainedCrossAxis>`** — `maxExtent:number` + single sliver child; `SliverConstrainedCrossAxis(maxExtent:, sliver: onlyChild(node))`.
**`<SliverCrossAxisExpanded>`** — `flex:number` + single sliver child (must be a direct child of SliverCrossAxisGroup); `SliverCrossAxisExpanded(flex:, sliver: onlyChild(node))`.
**`<SliverLayoutBuilder>`** — **builder** `(constraints) => sliver` (signal pattern). Dart `SliverLayoutBuilder(builder: (ctx, c) { node.callback('onConstraints')?.call({camelCase SliverConstraints fields}); return onlyChild(node) ?? const SliverToBoxAdapter(child: SizedBox()); })`. Constraints object: `crossAxisExtent, scrollOffset, remainingPaintExtent, viewportMainAxisExtent, precedingScrollExtent, overlap, axisDirection, growthDirection, userScrollDirection`.

### Decoration / effect

**`<DecoratedSliver>`** — `decoration:DecorationInput`, `position 'background'|'foreground'`; `DecoratedSliver(decoration: node.boxDecoration('decoration')!, position:, sliver: onlyChild(node))`.
**`<SliverOpacity>`** — `opacity:number`, `alwaysIncludeSemantics?`; `SliverOpacity(opacity:, sliver: onlyChild(node))`.
**`<SliverAnimatedOpacity>`** — `opacity:number`, `duration:number(ms)`, `curve:string`, `onEnd?`; `SliverAnimatedOpacity(opacity:, duration: Duration(ms), curve: node.curve('curve'), onEnd: node.callback('onEnd'), sliver: onlyChild(node))`.
**`<SliverIgnorePointer>`** — `ignoring:boolean`; `SliverIgnorePointer(ignoring:, sliver: onlyChild(node))`.
**`<SliverSafeArea>`** — `top/bottom/left/right:boolean=true`, `minimum:EdgeInsets`; `SliverSafeArea(..., sliver: onlyChild(node))`.

### Interactive

**`<SliverReorderableList>`** → `FuseSliverReorderableList`
- children = rows (eager). `onReorder: (oldIndex, newIndex) => void` (required), `onReorderStart?`, `onReorderEnd?`,
  `itemExtent?:number`, `prototypeItem?:slot`.
- Dart: `SliverReorderableList(itemCount: node.children.length, itemBuilder: (_, i) => FuseNodeWidget(node: node.children[i]) /* keyed by ValueKey(node.id) — required */, onReorder: (o,n) => node.callback('onReorder')?.call({'oldIndex': o, 'newIndex': n}), onReorderStart:, onReorderEnd:, itemExtent:, prototypeItem:)`.
  Each row must carry a Key — `FuseNodeWidget` already keys by `ValueKey(node.id)`. (No `proxyDecorator` initially — needs animation-to-JS.)
**`<ReorderableDragStartListener>` / `<ReorderableDelayedDragStartListener>`** — `index:number`, `enabled?:boolean`, single child; wrap `ReorderableDragStartListener(index:, enabled:, child: node.flexChildren)` (delayed = the subclass).
**`<CupertinoSliverRefreshControl>`** → `FuseCupertinoSliverRefreshControl`
- `onRefresh: () => Promise<void>` (async → `node.asyncCallback('onRefresh')`), `refreshTriggerPullDistance?:number`, `refreshIndicatorExtent?:number`.
- Dart: `CupertinoSliverRefreshControl(onRefresh: () async { await node.asyncCallback('onRefresh')?.call(); }, refreshTriggerPullDistance:, refreshIndicatorExtent:)`.
**`<CupertinoSliverNavigationBar>`** → `FuseCupertinoSliverNavigationBar`
- Slots: `largeTitle`, `leading`, `middle`, `trailing`, `bottom`. Bools: `automaticallyImplyLeading, automaticallyImplyTitle, alwaysShowMiddle, stretch, transitionBetweenRoutes`. `brightness 'light'|'dark'`, `backgroundColor`, `border?`, `padding?`. (No `.search` variant — version-gated, omitted.)
**`<RefreshIndicator>`** (host wrapper, not a sliver) → `FuseRefreshIndicator`
- single child (a CustomScrollView), `onRefresh: () => Promise<void>` (async), `triggerMode 'onEdge'|'anywhere'`,
  `color`, `backgroundColor`, `displacement`, `edgeOffset`, `strokeWidth`, `adaptive?:boolean` (→ `.adaptive`).

---

## Stage 2 — integration (serial)
Wire all `registerWidget(...)` into `solid_fuse_package.dart`; all `export {...}` into `src/index.ts`;
shared type additions (`CurveInput` union, any new shared inputs) into `src/types.ts`. Run
`bun run build` (JS) and `cd dart && flutter analyze`.

## Stage 3 — verify
Extend `examples/polyfill_tests` integration_test (macOS) covering: a CustomScrollView with SliverList
(scroll + lazy build), SliverAppBar (collapse), array-prop actions, an async onRefresh round-trip,
SliverPersistentHeader shrinkOffset push.

## Stage 4 — demo + docs
Add a sliver showcase page to `examples/demo` and a docs topic under `packages/docs/content/docs/`
(wire into nav `meta.json`). Cover: CustomScrollView, lists/grids, app bars, sticky headers,
pull-to-refresh, reorderable. Document version gates (PinnedHeaderSliver ≥3.24, snapMode ≥3.27).

## Deliberate omissions
`SliverVariedExtentList`/`itemExtentBuilder` (sync per-index JS impossible), `SliverAnimatedList`/`Grid`
(imperative exit-animation builders — bad fit for reactive eager children; revisit with a reactive
animation primitive), `SliverFadeTransition` (no Animation-handle infra), `SliverOffstage`/`SliverVisibility`
(use `<Show>`), `AppBar` (not a sliver; needs a Scaffold element), `SliverEnsureSemantics` (niche, ≥3.35),
Cupertino nav `.search` (version-gated), low-level `Viewport`/`Scrollable`/raw delegates.

## Known follow-ups — NestedScrollView (works, but the rough-edge piece)

The current `FuseNestedScrollView` resolves the header reactively by extracting `childWidgets`
from an *unmounted* `<nestedScrollHeader>` node inside `headerSliverBuilder`. It's correct for the
common case but has sharp edges worth refining:

1. **Redundant `onHeader` sends.** `headerSliverBuilder` calls `node.callback('onHeader')` on every
   invocation (many per scroll), even when `innerBoxIsScrolled` is unchanged. The JS signal
   value-equality no-ops it, but the bridge send still fires each time. Fix: guard Dart-side — store
   the last `innerBoxIsScrolled` and only call `onHeader` on change.
2. **Structural header changes can go stale.** Because the `<nestedScrollHeader>` node's own
   `FuseNodeWidget` isn't mounted (only its extracted `childWidgets` are), a reactive change to the
   *number* of top-level header slivers may not refresh until the next scroll-driven
   `headerSliverBuilder` run. Prop changes on a stable set of header slivers (the normal
   `SliverAppBar` pattern) are fine; a varying sliver *count* is the gap. Either mount the header
   node properly or rethink how the header builder produces slivers so structural changes propagate.
3. **The `nestedScrollHeader` sub-element is a hack.** The reactive-child-into-extracted-childWidgets
   indirection is the awkward part; a cleaner header-reactivity design would remove it.
4. **~1-frame lag** is inherent to the push-to-signal pattern (shared with `SliverPersistentHeader`
   and `SliverLayoutBuilder`). Acceptable for `innerBoxIsScrolled` (a coarse bool); noted for completeness.

Loop-safety is NOT a concern: `onHeader → setInnerBoxIsScrolled` re-renders only the header *content*
(not `headerSliverBuilder`), and the Solid setter's value-equality is a backstop. Confirmed safe.
