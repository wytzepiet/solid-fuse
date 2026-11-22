# solid_fuse_gen

Reads Dart signatures (Flutter, pub packages, later the app's own `@fuse` code)
with `package:analyzer` and writes one JSON manifest. The emitters in the fuse
CLI turn the manifest into TypeScript and Dart adapters; this package knows
nothing about TypeScript.

```bash
dart run solid_fuse_gen --root <flutter app> --config gen.json --out fuse.manifest.json
```

It runs from the app (a dev dependency), so dartdev caches its snapshot. The
analyzer's summaries are cached in `<root>/.dart_tool/solid_fuse_gen/cache`.
When the config, `pubspec.lock` and `package_config.json` haven't changed, the
run stops at the input hash. Measured warm on the cloud box: all of
`widgets.dart` + `material_ui` (583 widgets) takes about 4 s, 30 widgets about
2.5 s, and an unchanged input about 0.4 s.

## Rules

`lib/src/classify.dart` holds them all. They are structural, and the only names
they know are the framework roots (Widget, Key, Listenable, BuildContext, State,
RenderObject, Element).

- **Handles** are Listenables, plus classes with mutable state (a non-final
  field or an explicit setter) that aren't `@immutable`.
- **Data** is every other exported class. Its variants are its public
  constructors and those of its exported subclasses (at most 40, tagged by
  class). Its constants are the `static const` fields of the type, its
  subclasses, and namespace classes (Colors, Curves). A namespace class with
  more than 400 constants (Icons) is left out.
- **Enums** become plain value lists, with deprecated values marked.
- **Callbacks** are `void` or `Future` callbacks. A callback that returns a
  value synchronously (a builder) is skipped until fjs has sync calls.
- **Anything else** is a skip with a reason. An optional parameter stays in the
  signature as `skip`, so positional order is kept. A required one skips the
  item, which lands in `skipped`. Nothing is fatal, and an unexpected exception
  becomes `internal error: ...`, which the tests treat as a failure.

A type that no entry library exports (flutter_map's `LatLng` is latlong2's)
triggers a second round, which loads that package's public libraries.

## Manifest (format 1)

```jsonc
{
  "format": 1, "generator": "0.1.0", "fingerprint": "…", "inputHash": "…",
  "imports": [{ "uri": "package:flutter/widgets.dart", "prefix": "widgets" }],
  "widgets": [{
    "id": "package:flutter/widgets.dart#Image.network", "component": "ImageNetwork",
    "class": "Image", "ctor": "network", "dart": "widgets.Image",
    "children": { "param": "child", "many": false },   // or "textChild": "data"
    "params": [{ "name": "src", "named": false, "required": true,
                 "dart": "String", "type": { "k": "String" },
                 "default": "1.0", "defaultValue": 1 }]  // or "skip": "why" (+ "passNull")
  }],
  "handles": ["package:flutter/widgets.dart#ScrollController"],   // exported roots
  "types": {
    "<import uri>#<Dart type>": { "kind": "data", "variants": [{ "tag": "symmetric", "params": [...] }],
                                  "consts": [{ "name": "Colors.red", "dart": "material_ui.Colors.red" }],
                                  "fields": [...] },             // fields: Dart -> JS encoding
    "…": { "kind": "enum", "values": ["start", { "name": "x", "deprecated": true }] },
    "…": { "kind": "handle", "ctors": [...], "supertypes": [...] }
  },
  "skipped": [{ "item": "…#Image.memory", "reason": "bytes: typed data (not bridged yet)" }]
}
```

The `k` values for refs are `bool int double num String Object dynamic enum
data handle widget key list set iterable map fn typeParam`. A nullable ref
carries `"null": true`. An `fn` has `args` (output refs, or `context` /
`omitted`), `ret`, and `async` / `sync`. Every `dart` string uses the prefixes
in `imports`.

## Tests

```bash
dart test   # needs flutter on PATH (the fixture's pub get)
```

`test/rules_test.dart` has one fixture per rule. `test/whole_libraries_test.dart`
runs everything in widgets, material_ui and cupertino_ui and checks that every
ref resolves and nothing failed internally.
