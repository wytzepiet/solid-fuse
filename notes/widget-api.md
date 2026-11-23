# The widget API

How solid-fuse's components are shaped, and why. Flutter 3.47+ split its UI
into design-free behaviour (`package:flutter/widgets.dart`: RawRadio,
RadioGroup, RawTooltip, RawMenuAnchor, Expansible, showRawDialog, page
transitions) and two skins on top (`material_ui`, `cupertino_ui`, separate pub
packages). solid-fuse follows the same split, as if it had been designed this
way from the start.

## Layers

| Layer | Import | What it is |
| --- | --- | --- |
| Generated | `#fuse/flutter`, `#fuse/material_ui`, `#fuse/cupertino_ui`, ... | Flutter exactly as it is, generated per app from `lib/fuse.dart` barrels. The escape hatch: everything Flutter has, with Flutter's names. |
| Core | `solid-fuse` | Design-free building blocks with a TS-shaped API: layout, text, input behaviour, navigation, overlays. Depends on `widgets` only. No Button: Flutter's core has none. |
| Design | `@solid-fuse/material`, `@solid-fuse/cupertino` | Styled components, built on the generated layer and core's behaviour. Same names and props in both where the concept is the same. |
| Adaptive | `@solid-fuse/adaptive` | One component per shared concept that renders Material on Android/desktop/web and Cupertino on iOS/macOS. |

A design package is a fuse package like any other: a `dart/lib/fuse.dart`
barrel that exports its Flutter library (so the app generates
`#fuse/material_ui`), a little hand-written Dart where the generated layer
can't express the behaviour (controlled text, routes), and TypeScript on top.
It ships TypeScript source; the app compiles it, because it imports the app's
generated modules.

## Rules

1. **State is a controlled prop, commands are on a handle.** `value` +
   `onChange(next)` for what the user edits; the signal is the single source
   of truth. Leave `value` out and the component keeps its own state
   (`defaultValue` seeds it). Commands that are actions, not state (scroll
   there, focus now), live on a handle from `createX()`
   (`createScrollController`, `createFocusNode`). A handle may expose state as
   read-only signals (`scroll.scrollOffset()`).
2. **Names for state pairs:** `value`/`onChange` (inputs, switches, sliders,
   radio groups, segmented controls), `open`/`onOpenChange` (dialogs, sheets,
   menus), `expanded`/`onExpandedChange`, `selected`/`onSelect` (tabs,
   navigation bars; the index).
3. **Events are `on` + a verb, in the present:** `onPress`, `onLongPress`,
   `onChange`, `onSubmit`, `onDismiss`. Not Flutter's `onPressed`/`onChanged`.
4. **`disabled` disables.** Never "pass null as the handler".
5. **Enums are string unions** with Flutter's spelling (`"spaceBetween"`).
6. **Content is JSX children.** Secondary slots are JSX props named for what
   they hold (`leading`, `trailing`, `title`, `actions`). A slot that's usually
   text also takes a string (`title="Settings"`).
7. **Overlays are components.** `<Dialog open={open()} onOpenChange={setOpen}>`
   instead of `showDialog()`. The content is the children, rendered by the
   overlay's route; closing (barrier tap, back button) calls `onOpenChange(false)`.
8. **Icons are constants.** `icon={Icons.add}` (material) or
   `icon={CupertinoIcons.add}` (cupertino). Each is its own export, so a
   release build ships only the glyphs used.
9. **Colors are CSS-like** (`"#6750a4"`, `"red"`, `{ r, g, b }`) everywhere.
10. **Theme comes from JS.** The app root (`<MaterialApp theme={...}>`,
    `<CupertinoApp>`, core `<App>`) takes the theme; dark mode follows
    `host.brightness()` unless the theme mode says otherwise. Components read
    the theme in Dart, as Flutter's do.
11. **The page type follows the app.** `nav.push(() => <Screen />)` uses the
    app root's page: a Material page under `MaterialApp`, a Cupertino page
    under `CupertinoApp`, a plain fade page under core `App`.
12. **Thin over generated.** A design component is a TS wrapper that renders
    the generated component with these rules applied. Anything it doesn't
    expose is one import away in `#fuse/<package>`.
13. **Layout: forced on everything, convenience on core.** `layout` on any
    element with children says how several lay out (a column by default):
    JSX can't say "one child", so generated `child` widgets take it too.
    `flex` (a share of the free space, CSS `flex: 1`) is a core-element
    prop only; generated widgets stay Flutter and use `Expanded`. Generated
    = Flutter plus what JSX forces; core = our box model, where props save
    nesting. Elements that draw elsewhere (`<Modal>`) never take part in
    layout.

## Core (`solid-fuse`)

| Component | Built on | Notes |
| --- | --- | --- |
| `App` | WidgetsApp | Root: title, color, locale, text style. Hosts an Overlay so tooltips and menus work without a Navigator. |
| `View`, `Text`, `Stack`, `Positioned`, `ScrollView`, `GestureDetector` | (existing) | Unchanged. |
| `Icon` | generated `Icon` | `icon={Icons.x}`; tree-shaken. Icon sets live in the design packages. |
| `Pressable` | GestureDetector + FocusableActionDetector | `onPress`, `onLongPress`, `disabled`; `onPressedChange` / `onHoveredChange` / `onFocusedChange` (one event per flag, like `onOpenChange`; Dart reports only those passed); a function child gets them as accessors: `{(s) => <View opacity={s.pressed() ? 0.5 : 1} />}`. Keyboard activation, semantics as a button. |
| `TextInput` | EditableText | Unstyled text editing: `value`/`onChange`, `placeholder`, text style props, keyboard options, `onSubmit`, `focusNode`. Dart owns the live text; JS writes win only when they're not an echo of what Dart sent. |
| `Navigator`, `page()` | Navigator 2.0 pages | `page({ transition: "fade" | "slide" | "none" })`. `materialPage`/`cupertinoPage` move to their packages. |
| `Modal` | RawDialogRoute | `open`/`onOpenChange`, `dismissible`, `barrierColor`. The generic overlay route: design packages register their own route types (`materialDialog`, `bottomSheet`, `cupertinoModalPopup`) on the same mechanism. |
| `RadioGroup` | RadioGroup | `value`/`onChange`; the design packages' `Radio`s inside it join it. |
| `Tooltip` | RawTooltip | `content` (JSX), `trigger` (`"longPress"` / `"tap"` / `"manual"`), delays. |
| `Menu` | RawMenuAnchor | `open`/`onOpenChange`, `content` (JSX overlay), children = the anchor. |
| `Expandable` | Expansible | `expanded`/`onExpandedChange`, `header`, children = body; animated. |

## Material (`@solid-fuse/material`)

`MaterialApp` (theme, darkTheme, themeMode; `theme` takes `{ seedColor, ... }`
or a generated `ThemeData`), `Scaffold`, `AppBar`, `Button` (`variant`:
filled, tonal, outlined, text, elevated), `IconButton`, `FloatingActionButton`,
`Switch`, `Checkbox`, `Radio`, `Slider`, `TextField`, `Card`, `ListTile`,
`Divider`, `Chip`, `NavigationBar` + `NavigationDestination`, `ProgressIndicator`,
`Badge`, `Dialog`, `BottomSheet`, `materialPage`, `Icons`.

## Cupertino (`@solid-fuse/cupertino`)

`CupertinoApp`, `PageScaffold`, `NavigationBar`, `Button` (`variant`: plain,
tinted, filled), `Switch`, `Checkbox`, `Radio`, `Slider`, `TextField`,
`ActivityIndicator`, `SegmentedControl`, `ListSection` + `ListTile`, `Dialog`
(alert), `ActionSheet`, `cupertinoPage`, `CupertinoIcons`.

## Adaptive (`@solid-fuse/adaptive`)

`AdaptiveApp`, `Button`, `Switch`, `Checkbox`, `Slider`, `TextField`,
`ProgressIndicator`, `Dialog` (alert: title, message, actions). It picks by
`host.platform`; `<AdaptiveProvider platform="ios">` overrides it for a
subtree.
