# Objects and plugin modules: generator spike

The "objects" and "callback interfaces" half of the interop design, and the
non-UI half of `fuse add <pub_package>`. Derives, from resolved Dart APIs
(`package:analyzer` element model):

- for a class with identity (`ScrollController`, `AnimationController`, a pub
  package's controller): a Dart `FuseHandle` subclass and a typed TS factory;
- for a package's top-level functions and static members: one Dart channel
  handler and one typed async TS module.

Findings: `../reports/07-objects.md`.

Standalone Flutter package, not part of the bun workspace. Needs Flutter 3.50
(`/opt/flutter`), `tsc` and `bun` on PATH, and network for the first
`flutter pub get` / `bun install`.

## Run

```bash
./run.sh     # survey + generate + flutter analyze + tsc --strict + bun test + flutter test, about 5 min
```

Step by step (each `dart run` resolves the Flutter element model, 15 to 40 s):

```bash
export PATH=/opt/flutter/bin:$PATH
flutter pub get && (cd ts && bun install)

dart run tool/survey_objects.dart        # Part 1 -> out/objects-survey.md (+ .json, every member)
dart run tool/gen_objects.dart           # Part 3 -> lib/generated/controllers.g.dart, ts/generated/controllers.ts
                                         #           driven by fuse.objects.json (the declaration file)
dart run tool/gen_module.dart --name url_launcher \
  --lib package:url_launcher/url_launcher.dart=url_launcher      # Part 4, any pub package

flutter analyze                                                   # generated Dart, support, tools, tests
(cd ts && tsc -p .)                                               # generated TS vs the real solid-fuse source
(cd ts && bun test --conditions browser --tsconfig-override ./tsconfig.json)   # JS half, executed
flutter test                                                      # Dart half, against real controllers / plugins
```

## Layout

```
fuse.objects.json            the declaration file: which classes, which getters to mirror, guards, excludes
tool/survey_objects.dart     Part 1
tool/gen_objects.dart        Part 3 CLI
tool/gen_module.dart         Part 4 CLI
tool/src/objects.dart        member model: how each constructor / method / getter / setter crosses (shared by survey and emitters)
tool/src/objgen.dart         object emitter (Dart handle + TS factory)
tool/src/modgen.dart         module emitter (channel handler + TS module) and file assembly
tool/src/{world,classify,gen,overrides}.dart   copied from ../gen; small marked additions ("objects spike")
lib/fuse_obj_support.dart    hand-written Dart runtime the generated code calls (errors, adoption, tickers, streams)
lib/fuse_gen_support.dart    codec helpers, copied from ../gen plus Uri / DateTime / File / Directory
lib/generated/*.g.dart       GENERATED
ts/fuse-objects.ts           hand-written JS runtime on top of createHandle and channels
ts/generated/*.ts            GENERATED
ts/sample.ts, sample-modules.ts   type-level usage, including negative (@ts-expect-error) cases
ts/runtime.test.ts           executes generated factories against the real handle.ts / renderer.ts / channels.ts, fjs faked
test/                        flutter tests: handles driven through `call`, modules through their channel handler
out/                         survey and per-run reports
```

`ts/tsconfig.json` maps `solid-fuse/*` to `packages/solid-fuse/src/*`, so the
generated TS is checked against the real `Handle`, `createHandle`, `channels`
and `FuseNode`. `solid-js` is installed locally in `ts/node_modules` because
the repo itself has none.

## Wire conventions the generated code assumes

- Object = a node with a handle, as today. JS-created ones get JS ids; objects
  Dart creates and hands over get negative ids (`fuseAdopt`).
- RPC arguments: one map keyed by Dart parameter name, positional ones too.
  Records and enums by the widget generator's rules. Object arguments are
  `{_node: id}`.
- Generic members: `$get {name}`, `$set {name, value}`, `$listen {name}`, `$cancel {name}`.
- Mirrored state: Dart calls the node's `$state` function prop with a patch of
  changed fields. Stream events: `$event` with `{s, v}` or `{s, e}`.
- Errors: the Dart side returns `{$err: {type, message, code?, details?, stack?}}`
  instead of throwing; TS rethrows it as `FuseError`.
- Module: channel `mod:<name>` with `{m, a}`; stream events on `mod:<name>:event`.
