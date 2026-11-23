# solid_fuse_gen

Reads Dart signatures with `package:analyzer` and writes one JSON manifest.
What it reads is what the barrels export: the app's `lib/fuse.dart` and every
package's `lib/fuse.dart` (`lib/src/barrels.dart`). The emitters in the fuse
CLI turn the manifest into TypeScript and Dart adapters; this package knows
nothing about TypeScript.

```bash
dart run solid_fuse_gen --root <flutter app> --config gen.json --out fuse.manifest.json
```

With `--serve` it stays running and reads one run per line on stdin (`{}` or
`{"force": true}`), answering each with one JSON line (`{"code", "message"}`).
The analyzer keeps what it resolved, and before each run it is told which files
under `lib/` changed (a new `package_config.json` or `pubspec.lock` starts it
over). `fuse dev` uses this: a run after an edit takes 30 to 150 ms instead of
about 2 s. It exits when stdin closes, and with 75 when its own code changed.

`gen.json` is `{}` for an app: the barrels say everything. Tests and tools can
add `libraries` with allow/deny patterns (`lib/src/config.dart`).

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
  field or an explicit setter) that aren't `@immutable`. A handle JS creates
  (a root, see `handles`), and every handle type that reaches JS some other
  way (a callback argument, a getter, a method result), lists its members:
  the getters JS mirrors (a
  Listenable's), setters, methods (`void`, a value, or a Future of one) and
  Stream getters. Members of Object, Listenable, ChangeNotifier and the
  Diagnosticable classes are left out, and so are members a mixin or an
  interface that isn't a handle declares (WidgetsBindingObserver's).
- **Supplied** parameters are never props: a TickerProvider (`vsync`) comes
  from the runtime, a BuildContext is the one the adapter builds in (only in
  widget adapters).
- **Implementations**: an abstract data type that can be extended from
  outside its library (not sealed, final or interface, with a constructor
  without required parameters, not F-bounded, no unnamed constructor of
  its own) gets `implement`: the superclass constructor and each abstract
  member as a callback (`fn`), with the override's Dart signature. JS
  passes an object of functions (no `$`); a generated subclass calls them.
  An abstract setter, or a member no callback can stand for, leaves it out
  (`implementSkipped`).
- **Values with a form of their own**: typed data is `{"k": "bytes", "as":
  "<class>"}` (an ArrayBuffer in JS; in an op batch the bytes ride next to
  the JSON as `{$bytes: i}`); a map whose key isn't a string, int or enum
  has `entries` (`[key, value]` pairs); a callback's named parameters
  (`named`, `required`) reach JS as one object after the positional ones; a
  named parameter whose default generated code can't write has `omit` and
  is passed (through `Function.apply`) only when JS gives it.
- **Typed widget slots** (`PreferredSizeWidget appBar`, `List<Tab> tabs`)
  are `{"k": "widget", "as": "<Dart type>"}`: the adapter builds the child
  node's own widget in its context (every adapter has a static `make`) and
  checks its type, and rebuilds when such a child changes. Values and
  handles are decoded without a context, so they can't take one, and a
  callback can't return one.
- **Type parameters** resolve to their bounds (`Object?` when unbounded),
  everywhere: a generic widget is instantiated at them, and a type generic
  over one (`DropdownMenuEntry<T>`) is read as that instantiation.
- **Data** is every other exported class. Its variants are its public
  constructors and those of its exported subclasses (at most 40, tagged by
  class). Its constants are the `static const` fields of the type, its
  subclasses, and namespace classes (Colors, Curves, Icons), all of them:
  the release build keeps the ones the bundle names (`cli/gen/shake.ts`).
- **Enums** become plain value lists, with deprecated values marked.
- **Callbacks**: a `void` callback is called without waiting, a `Future` one
  waits for the JS result, and one that returns a value at once (a builder)
  is a synchronous call (`sync`). A generic callback (its own type
  parameters) is skipped: JS can't produce a value for every `T`.
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
    "children": { "param": "child", "many": false },
    "params": [{ "name": "src", "named": false, "required": true,
                 "dart": "String", "type": { "k": "String" },
                 "default": "1.0", "defaultValue": 1 }]  // or "skip": "why" (+ "passNull")
  }],
  "handles": ["package:flutter/widgets.dart#ScrollController"],   // exported roots
  "types": {
    "<import uri>#<Dart type>": { "kind": "data", "variants": [{ "tag": "EdgeInsets.symmetric", "params": [...] }],
                                  "consts": [{ "name": "Colors.red", "dart": "material_ui.Colors.red" }],
                                  "fields": [...] },             // fields: Dart -> JS encoding
    "…": { "kind": "enum", "values": ["start", { "name": "x", "deprecated": true }] },
    "…": { "kind": "handle", "ctors": [...], "supertypes": [...],
           // roots only:
           "state": [{ "name": "offset", "type": {...} }], "setters": [{ "name": "text", "type": {...}, "dart": "String" }],
           "methods": [{ "name": "animateTo", "params": [...], "ret": {...}, "async": true }],
           "streams": [...], "disposable": true, "memberSkips": { "position": "why" } }
  },
  "skipped": [{ "item": "…#Image.file", "reason": "file: not exported: File" }]
}
```

Tags and constant names are absolute (`Class.ctor`, `Class` for the unnamed
constructor, `Owner.field`), so a value decodes the same under any declared
type. A plain object without `$` means the declared type's unnamed
constructor. Collection refs carry `ofDart` / `keyDart` (the element types'
Dart source) for the decoders' type arguments.

The bridge's current limits are applied as a last pass (`_prune`): a handle
method or setter can't take a function or a widget (it goes through a channel
call, which registers no function and keeps no node alive). A parameter
that would need more is a `skip` like any other.

The `k` values for refs are `bool int double num String Object dynamic enum
data handle widget key supplied list set iterable map fn typeParam`. A nullable ref
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
