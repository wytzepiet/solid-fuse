# @solid-fuse/lucide

[Lucide](https://lucide.dev/) icons for [solid-fuse](https://github.com/wytzepiet/solid-fuse) — 1699 tree-shakeable `IconData` exports rendered by the core `Icon` widget.

Lucide ships as a font (via [`flutter_lucide`](https://pub.dev/packages/flutter_lucide)), so there's no new widget and no SVG runtime: each export is a plain `IconData`, identical to `solid-fuse/icons/material`.

## Install

```bash
bun add @solid-fuse/lucide
```

Then run `fuse link` (or `fuse dev`, which links automatically). That adds the
`lucide` Dart package to your app's `pubspec.yaml`, which pulls in
`flutter_lucide` and bundles the `lucide` font.

## Usage

```tsx
import { Icon } from "solid-fuse";
import { house, search, settings } from "@solid-fuse/lucide";

<Icon data={search} size={24} color="#111827" />;
```

Names match Lucide's, camel-cased — `circle-alert` becomes `circleAlert`. Two
names collide with JS reserved words and gain a trailing underscore: `delete_`
and `import_`.

Import only the icons you use — every export is marked `/*#__PURE__*/`, so the
bundler drops the rest rather than shipping all 1699 glyphs.

## Regenerating

The icon set is generated from the installed `flutter_lucide` version:

```bash
cd dart && flutter pub get   # ensure flutter_lucide is in the pub cache
bun run gen-icons            # regenerates src/index.ts
bun run build
```

Bump `flutter_lucide` in `dart/pubspec.yaml`, then re-run the above to pick up
new icons.
