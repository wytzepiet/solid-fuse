# dart-to-ts — baseline prop scraper

**Question:** today every widget is written twice — a Dart builder that reads
untyped props (`node.double('fontSize')`, `node.color('color')`, …) and a TS
wrapper with a hand-typed `XProps` interface. How much of the TS side can we
generate from the Dart side using *syntax alone* (no annotations, no schema)?

This is the baseline to beat. Anything smarter (annotations, a schema the Dart
side registers, resolved-AST analysis) should be compared against these numbers.

## What it does

1. `bin/generate.dart` parses `packages/solid-fuse/dart/lib/src/widgets/*.dart`
   with `package:analyzer` (parse-only, so it doesn't need `package:flutter`
   resolved) and collects, per class:
   - `node.<accessor>('key')` calls → TS type via `accessorTypes` in `lib/scrape.dart`
   - `node.props['key'] as T?` reads
   - string-enum literals, from `node.string('x') == 'lit'`, `switch` cases, and
     same-file helpers like `_parseTextAlign(node.string('textAlign'))`
   - the JSX tag, from `runtime.registerWidget('tag', Class.new)` in
     `solid_fuse_package.dart`
2. Writes `out/widgets.generated.d.ts` (+ `.json` for tooling).
3. `compare.ts` diffs that against the hand-written `*Props` interfaces in
   `packages/solid-fuse/src/widgets/`.

## Run

```bash
cd experiments/dart-to-ts
dart pub get && bun install     # once
bun run all                     # generate → tsc typecheck → compare
```

Needs Dart ≥ 3.12 (Flutter 3.50 ships 3.14) and bun.

## First result (main @ a736e30, 9 widget classes)

`matched=131 onlyDart=0 onlyTs=55`, and 52 matched props whose types differ.

- **Every prop Dart reads exists in TS** (onlyDart=0), so the scraper finds no
  undocumented props.
- **Most gaps are props read through non-literal keys.** `GestureDetector` loops
  over event names and calls `node.callback(name)`, so ~40 `on*` handlers and
  their `details` payload types are invisible. `flex` is read by a shared helper,
  not by the widget class.
- **String enums are partly recoverable.** Helpers with `switch` cases give the
  full union (`textAlign`, `overflow`, …). Inline `== 'italic'` only gives the one
  literal it compares against (`fontStyle`), and helpers in other files
  (`parseClip`, `scrollDirection`) give nothing yet.
- **Structured types need a name map.** `transform`, `decoration`, `IconData`,
  handle types (`ScrollController`) come out as `Record<string, unknown>` /
  `unknown`.

The obvious next experiments: follow helpers across files, give callbacks a
literal key (or a registry), or flip it around and declare props once in a
schema both sides consume.
