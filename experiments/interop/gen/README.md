# Analyzer-driven generator spike

Drives solid-fuse widget generation from resolved Dart APIs (`package:analyzer`,
full element model) instead of scraping hand-written builders. Emits both sides:
a `.d.ts` (props interfaces + value types) and Dart adapters (a `StatelessWidget`
taking a `FuseNode`, plus per-type decoders/encoders).

Findings: `../reports/02-analyzer-spike.md`.

Standalone Flutter package; not part of the bun workspace. Needs Flutter 3.50
(`/opt/flutter`), `tsc` on PATH, and network for the first `pub get`.

## Run

```bash
./run.sh          # survey + generate (Flutter, fl_chart, percent_indicator) + analyze + tsc + test, ~2 min
```

or step by step (each `dart run` resolves the Flutter element model, ~15 s):

```bash
export PATH=/opt/flutter/bin:$PATH
flutter pub get

# Part 1: survey -> out/survey.md (+ out/survey.json, one row per parameter)
dart run tool/survey.dart

# Part 2: generate the default widget list -> lib/generated/flutter.g.dart, ts/generated/flutter.d.ts, out/flutter.report.json
dart run tool/generate.dart
dart run tool/generate.dart --widgets Text,Container,Image.network      # pick classes / named ctors
dart run tool/generate.dart --no-overrides                              # derived codecs only -> flutter_derived.*
dart run tool/generate.dart --name flutter_all --all-from package:flutter/material.dart --docs none   # every widget (16k lines)

# Part 3: any pub package: --lib <uri>=<import prefix> --all-from <uri>
dart run tool/generate.dart --name fl_chart --lib package:fl_chart/fl_chart.dart=fl_chart --all-from package:fl_chart/fl_chart.dart

flutter analyze            # generated Dart
(cd ts && tsc -p .)        # generated .d.ts against sample.tsx / sample-fl-chart.tsx
flutter test               # adapters pumped against the real widgets
```

## Layout

```
tool/src/world.dart       loads libraries; indexes exports, subclasses, static consts
tool/src/classify.dart    the rule engine: DartType -> family (shared by survey and generator)
tool/src/gen.dart         Dart + TS emitters
tool/src/overrides.dart   the only per-type knowledge: "nice" codec registry + children hints
tool/survey.dart          Part 1
tool/generate.dart        Part 2 / 3 CLI
lib/fuse_gen_support.dart hand-written runtime helpers the generated code calls (138 lines)
lib/generated/*.g.dart    GENERATED adapters + codecs
ts/generated/*.d.ts       GENERATED types (fuse-gen-base.d.ts is hand-written)
ts/sample*.tsx            type-level usage incl. negative (@ts-expect-error) cases
test/                     widget tests against generated adapters
out/                      survey + per-run reports (JSON)
```

## Wire conventions the generated code assumes

- enum -> its name; static const -> `"name"` (own class) or `"Owner.name"` (namespace/subclass)
- class -> object keyed by constructor parameter name (positional ones too);
  named constructor / subclass selected by `$`: `{ $: "symmetric", horizontal: 8 }`,
  `{ $: "LinearGradient", colors: [...] }`
- callback -> existing `true` marker; payload = the single argument, or an array for several;
  `BuildContext` arguments are not sent
- widget slot -> existing `{_node: id}`; `List<Widget>` props other than `children`
  need the renderer to resolve node refs inside arrays (not done in the runtime yet)
- handle -> `node.handle<T>(name)`
