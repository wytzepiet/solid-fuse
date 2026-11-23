# Incident: Pinput under a design-free app root (Nov 2026)

## What happened

pole-goals `app_2` (core `<App>`, no design package) renders `Pinput`
(pub.dev `pinput` 7, generated via `fuse gen`) on its code-entry page. In
debug it failed to build, twice, one assertion at a time:

1. `No Material widget found` (`debugCheckHasMaterial`)
2. `No MaterialLocalizations found` (`debugCheckHasMaterialLocalizations`)

Core `<App>` is a plain `WidgetsApp`: no `Material`, no Material
localizations. Release builds skip these asserts, so it would have shipped
looking fine and failed only in debug, or later on whatever the asserts guard
(text-selection toolbar labels).

## Fix (app-side, temporary)

One widget declared in the app's `dart/lib/fuse.dart`, wrapped around
`<Pinput>`:

```dart
class MaterialScope extends StatelessWidget {
  const MaterialScope({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Localizations.override(
        context: context,
        delegates: const [DefaultMaterialLocalizations.delegate],
        child: Material(type: MaterialType.transparency, child: child),
      );
}
```

Exporting only `Material` fixed the first assert and exposed the second, so
fix both at once.

## Takeaways for the design packages

- **Don't expect pub.dev packages to stop assuming `MaterialApp`.** pinput 7
  already imports `package:material_ui` (post-split) and still asserts both.
  The split moved where Material lives, not what packages need.
- **`MaterialApp` covers it** (it adds `DefaultMaterialLocalizations` itself),
  so under `@solid-fuse/material` this doesn't happen.
- **`CupertinoApp` and core `<App>` don't.** A Material-assuming package
  under `@solid-fuse/cupertino` or `/adaptive` hits the same two asserts.
  Decide there: give those roots Material localizations (cheap, invisible),
  or ship a documented `MaterialScope`-style wrapper. Same question for
  `ScaffoldMessenger` and `Theme`, which packages also look up.
- **Test one third-party Material widget under each app root** (pinput is a
  good one: it asserts both) in debug mode, since release hides it.
