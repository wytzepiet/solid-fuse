# 06 — `fuse add` / `fuse gen` end to end

Branch `spike/e2e` (worktree `/home/claude/wt/e2e`, 5 local commits (including this report) on top of `95e4e33`, not pushed).
Environment: Flutter 3.50.1 / Dart 3.14.0, analyzer 14.7.0, TypeScript 5.9.3, Vite 8.3.8, bun 1.4.4, Linux desktop under xvfb, 4 cores shared with another agent's engine build.

Paths are relative to the worktree root unless absolute.

## Verdict

The shape recommended in `04-architecture.md` holds up when it is actually run.

- **It works through the real pipeline.** An integration test loads a bundle built by the CLI into a real Flutter Linux app and asserts on the Flutter widget tree: Solid JSX, generated TS wrappers, renderer ops, the QuickJS bridge, generated Dart adapters, real `Scaffold` / `AppBar` / `ListTile` / `Switch` / `Slider` / `CircularPercentIndicator` / `LinearPercentIndicator` and an app-authored `RatingBadge`. Tapping the real `Switch` calls back into JS, updates two signals and re-renders five widgets. Both tests pass.
- **The manifest is enough for everything except Dart.** The TS module, the dev validators, the catalogue, the API diff and `fuse.lock` are all produced by the CLI from the manifest JSON, with no analyzer access. The Dart adapters are still emitted straight from the analyzer, because regenerating default values and import prefixes needs resolved elements. That is the one place the "single artefact" claim is not true yet.
- **`registerWidget` needed no change, but "no runtime change" is not quite true.** Four small framework changes were needed; they are listed under "What had to change in the framework".
- **The developer loop is slow.** `fuse gen` takes about 35 s here for 8 widgets, nearly all of it analyzer start-up. That is the biggest practical problem found, ahead of any typing friction.

## The flow as built

### Commands

```bash
fuse add percent_indicator            # pub dependency + config entry + generate + survey
fuse add fl_chart:^1.0.0 --include LineChart,BarChart
fuse gen                              # regenerate everything under `native` in fuse.config.ts
fuse gen --check                      # write nothing; exit 1 when output is stale (CI)
fuse catalog                          # markdown index of available widgets
fuse catalog RatingBadge [--json]     # one widget: props, defaults, docs, omitted params
fuse build --js-only --dev            # bundle only, in Vite development mode (keeps validators)
```

`fuse dev` and `fuse build` call the same staleness check before `fuse link` and regenerate when needed.

What `fuse add percent_indicator` printed in `examples/gen_e2e` (38 s wall):

```
Adding percent_indicator to .../examples/gen_e2e/dart/pubspec.yaml...
+ percent_indicator 4.2.5
Added percent_indicator to native.packages in .../examples/gen_e2e/fuse.config.ts
[fuse gen] flutter: 5/5 widgets, 139/151 params, 1288 lines Dart
[fuse gen] percent_indicator: 2/2 widgets, 57/61 params, 554 lines Dart
[fuse gen] app: 1/1 widgets, 8/9 params, 233 lines Dart
  ...
percent_indicator 4.2.5: 2 widget(s) generated
  CircularPercentIndicator: 29 props
      not bridged: onPercentValue (callback/sync-return)
  LinearPercentIndicator: 28 props
      not bridged: onPercentValue (callback/sync-return)

Use it:
  import { CircularPercentIndicator, LinearPercentIndicator } from "~/_generated/percent_indicator";
  fuse catalog CircularPercentIndicator      # props, defaults, docs

A new pub package means new native code: rebuild the app (`fuse dev` restarts `flutter run`).
```

### Config

```ts
// examples/gen_e2e/fuse.config.ts
export default defineConfig({
  native: {
    packages: {
      percent_indicator: {},                       // written by `fuse add`; { include: [...] } narrows it
    },
    flutter: ["ListTile", "Switch", "Slider", "AppBar", "Scaffold"],
    // app: ["fuse/*.dart"]                        // default: plain widgets under <dart>/lib/fuse/
  },
});
```

### Three inputs, three "units"

| Unit | Declared by | App imports | Wire tag |
|---|---|---|---|
| `flutter` | `native.flutter` allow-list (`"ListTile"`, `"Image.network"`) | `~/_generated/flutter` | `flutter.ListTile` |
| `<pub package>` | `fuse add`, `native.packages.<name>` | `~/_generated/percent_indicator` | `percent_indicator.CircularPercentIndicator` |
| `app` | any widget class in `<dart>/lib/fuse/*.dart` | `~/_generated/app` | `app.RatingBadge` |

Tags are `<unit>.<Component>`. Pub package names are unique and `flutter` / `app` are reserved, so tags cannot collide across packages.

### Generated layout (all committed in the app)

```
fuse.lock                                    versions + manifest hashes + fingerprint
src/_generated/
  flutter.manifest.json                      the artefact everything below is derived from
  percent_indicator.manifest.json
  app.manifest.json
  flutter.ts  percent_indicator.ts  app.ts   typed wrapper components (real modules)
  NATIVE.md                                  agent-facing index
  native.catalog.json                        same, machine-readable
dart/lib/_generated/
  flutter.fuse.g.dart  percent_indicator.fuse.g.dart  app.fuse.g.dart    adapters + register<Unit>Widgets
  fuse_generated.dart                        registerFuseGenerated(runtime)
  fuse_packages.dart                         (fuse link) now also calls registerFuseGenerated
```

### Where the Dart tool lives

`packages/solid-fuse/gen/`, a standalone pure-Dart package (`fuse_gen`, pinned `analyzer: 14.7.0`), shipped in the npm package's `files`. The CLI runs `dart run <solid-fuse>/gen/bin/fuse_gen.dart --job <tmp>.json`, with the analysis context pointed at the app's Dart root, so the app's own `package_config.json` decides which versions are read.

It is deliberately not inside `packages/solid-fuse/dart/` (the `solid_fuse` plugin): `dart run solid_fuse:gen` would put `package:analyzer` into every app's dependency resolution. The hand-written helpers the adapters call (`fuseEnum`, `fuseChild`, `niceColor`, ...) did move into the plugin, as `package:solid_fuse/gen_support.dart`.

### Sample generated code

App-authored widget (`examples/gen_e2e/dart/lib/fuse/rating_badge.dart`): an ordinary `StatelessWidget` with `label`, `stars`, `tone` (an enum declared in the same file), `color`, `padding`, `onTap`, `onRated` (`ValueChanged<int>`), `child`. Nothing in it mentions solid-fuse.

Dart adapter (`dart/lib/_generated/app.fuse.g.dart`, complete):

```dart
void registerAppWidgets(FuseRuntime runtime) {
  runtime.registerWidget('app.RatingBadge', FuseGenRatingBadge.new);
}

class FuseGenRatingBadge extends StatelessWidget {
  const FuseGenRatingBadge(this.node, {super.key});
  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final p = node.props;
    try {
      return app_fuse_rating_badge.RatingBadge(
        label: fuseReq(decString(p['label']), 'RatingBadge', 'label'),
        stars: decInt(p['stars']) ?? 0,
        maxStars: decInt(p['maxStars']) ?? 5,
        tone: fuseEnum(app_fuse_rating_badge.BadgeTone.values, p['tone']) ?? app_fuse_rating_badge.BadgeTone.neutral,
        color: decColor(p['color']),
        padding: decEdgeInsetsGeometry(p['padding']) ?? const EdgeInsets.symmetric(vertical: 6.0, horizontal: 12.0),
        onTap: node.callback('onTap'),
        onRated: p['onRated'] != true ? null : (a0) => node.callFunction(node.id, 'onRated', a0),
        child: fuseChild(node),
      );
    } catch (e, st) {
      return fuseBuildError(context, node, e, st);
    }
  }
}
```

TS module (`src/_generated/app.ts`, excerpt):

```ts
// GENERATED by `fuse gen` from app.manifest.json (app src-ac753402c96b). Do not edit.
import { nativeComponent } from "solid-fuse";
import type { FuseElement, FuseChildren, FuseFlex, NativeBaseProps, NativeColorInput } from "solid-fuse";

/**
 * A pill showing a label and a star count.
 *
 * Flutter: `RatingBadge` (wire tag `app.RatingBadge`)
 */
export interface RatingBadgeProps extends NativeBaseProps {
  children?: FuseChildren;
  /** solid-fuse layout convention applied when more than one child is given. */
  flex?: FuseFlex;
  /** Text shown before the stars. */
  label: string;
  /**
   * Number of filled stars (0 to 5).
   *
   * @default 0
   */
  stars?: number;
  /** @default "neutral" */
  tone?: BadgeTone;
  color?: Color;
  /** @default Dart `const EdgeInsets.symmetric(horizontal: 12, vertical: 6)` */
  padding?: EdgeInsetsGeometry;
  onTap?: () => void;
  /** Called with the 1-based index of the star that was tapped. */
  onRated?: (value: number) => void;
}
/** Flutter `RatingBadge`. Props: {@link RatingBadgeProps}. */
export const RatingBadge = /*#__PURE__*/ nativeComponent<RatingBadgeProps>("app.RatingBadge");

export type BadgeTone = "neutral" | "positive" | "negative";
export type Color = NativeColorInput | "Colors.transparent" | "Colors.black" | ... | { $: "fromARGB"; a: number; r: number; g: number; b: number } | ...;
```

The wrapper is not written as JSX (`<percent_indicator.CircularPercentIndicator {...props}/>`): a dotted JSX tag compiles to a member-expression component, not an intrinsic element. `nativeComponent(tag)` calls the renderer's `createElement` + `spread` directly, so the generated file is plain `.ts` and needs no Solid compile step.

Manifest (`src/_generated/app.manifest.json`, one line per prop so it diffs well):

```json
"RatingBadge": {
 "tag": "app.RatingBadge", "dart": "RatingBadge", "library": "package:gen_e2e/fuse/rating_badge.dart",
 "doc": "A pill showing a label and a star count.",
 "children": "child", "childrenParam": "child", "flexProp": true,
 "props": {
  "label": {"type":{"k":"string"},"dart":"String","required":true,"doc":"Text shown before the stars."},
  "stars": {"type":{"k":"int"},"dart":"int","default":"0","doc":"Number of filled stars (0 to 5)."},
  "tone": {"type":{"k":"enum","n":"BadgeTone"},"dart":"BadgeTone","default":"\"neutral\"","doc":"Colour scheme of the pill."},
  "color": {"type":{"k":"data","n":"Color"},"dart":"Color?","doc":"Overrides the colour chosen by [tone]."},
  "onRated": {"type":{"k":"callback","args":[{"name":"value","type":{"k":"int"}}]},"dart":"void Function(int)?","doc":"..."}
 }
}
```

Top-level keys: `manifestVersion`, `generator`, `unit`, `version`, `register`, `libraries`, `widgets` (with `omitted` and `notes` per widget), `skipped` (widget to reason), `enums`, `types` (per data type: `nice` forms with runtime matcher names, `consts`, `variants` with fields), `payloads`.

Usage (`examples/gen_e2e/src/index.tsx`):

```tsx
import * as F from "~/_generated/flutter";
import { LinearPercentIndicator } from "~/_generated/percent_indicator";
import { RatingBadge } from "~/_generated/app";

<F.Scaffold appBar={<F.AppBar title={<Text>Generated interop</Text>} actions={[<Text>{`taps ${taps()}`}</Text>]} />}>
  <Gauge value={level()} label="level" tone={on() ? "good" : "info"} />
  <LinearPercentIndicator percent={level() / 100} lineHeight={8} progressColor="Colors.teal" barRadius={4} />
  <F.ListTile
    title={<Text>Boost</Text>}
    subtitle={<Text>{on() ? "boost is on" : "boost is off"}</Text>}
    trailing={<F.Switch value={on()} onChanged={(v) => { setOn(v); setLevel(v ? 75 : 25); }} />}
    onTap={() => setTaps(taps() + 1)}
  />
  <F.Slider value={level()} min={0} max={100} divisions={4} onChanged={(v) => setLevel(Math.round(v))} />
  <RatingBadge label="Rating" stars={stars()} tone={stars() >= 4 ? "positive" : "neutral"} onRated={setStars} />
</F.Scaffold>
```

## What ran for real, and what did not

| Claim | Status |
|---|---|
| `fuse add percent_indicator` end to end (pub add, config edit, generate, link, survey) | Ran |
| `fuse gen` for Flutter allow-list, pub package and app-authored widget | Ran; generated Dart passes `flutter analyze`, generated TS passes `tsc --strict` |
| Generated wrapper through JSX, renderer, QuickJS bridge, generated adapter, real widget | Ran: `examples/gen_e2e/dart/integration_test/generated_widgets_test.dart`, 2 tests pass (output in `experiments/interop/e2e/e2e-test.out.txt`) |
| Callback from Flutter into JS that updates a signal and re-renders | Ran: `Switch.onChanged(bool)`, `ListTile.onTap`, `RatingBadge.onRated(int)` |
| Widget slots (`title`, `subtitle`, `trailing`, `center`, `footer`), node-list prop (`AppBar.actions`), `PreferredSizeWidget` (`Scaffold.appBar`) | Ran, asserted in the test |
| Dev-mode validation in a real app | Ran in a debug Flutter build with a `fuse build --dev` bundle |
| Dev-mode validation under a live `fuse dev` session | Not run. Checked only that the Vite dev server appends the prelude import to `src/index.tsx` and serves the virtual module with 3 manifests registered |
| Release build without validators | Bundle checked (no validator strings, 78 KB against 207 KB for the dev bundle). Release Flutter build not run |
| `fuse.lock`, `fuse gen --check`, regeneration from `fuse build` on mismatch | Ran |
| Upgrade safety on a real package | Ran: badges 2.0.3 to 3.2.0, `experiments/interop/e2e/skew-demo.sh` |
| All of material.dart through the new manifest path | Generated and measured; the TS compiles; Dart not re-analysed in this spike (02 did that with the same emitter) |
| `fuse dev` with `flutter run`, hot reload / hot restart after regeneration, a file watcher | Not run, not built |
| iOS / Android, bytecode cache, OTA | Not touched |
| Generated `Text`, `Container`, `Expanded`, `DropdownButton` at runtime | Not run. Type-level only (`experiments/interop/e2e/friction.tsx`) |

The test asserts on real widget state, for example:

```dart
final circle = tester.widget<CircularPercentIndicator>(find.byType(CircularPercentIndicator));
expect(circle.percent, 0.25);
expect(circle.progressColor, const Color(0xFF3366FF));
expect(tester.widget<LinearPercentIndicator>(find.byType(LinearPercentIndicator)).progressColor, Colors.teal);
expect(badge.padding, const EdgeInsets.symmetric(horizontal: 12, vertical: 6)); // regenerated default

await tapVisible(tester, find.byType(Switch));
await pumpUntil(tester, text('level 75'), reason: 'Switch.onChanged round trip');
expect(tester.widget<Switch>(find.byType(Switch)).value, isTrue);
expect(tester.widget<CircularPercentIndicator>(find.byType(CircularPercentIndicator)).percent, 0.75);
```

It runs in debug mode with no dev server, so `FuseRuntime.start()` falls back to `assets/js/bundle.js`, which is the same loading path as `quickjs_connection.dart` in production.

## What had to change in the framework

The architecture report said registration could go through `runtime.registerWidget` with no runtime change. Registration did. These did not:

1. **`nativeComponent(tag)` in the renderer** (`src/renderer.ts`, exported from `solid-fuse`), because dotted tags cannot be JSX intrinsics.
2. **Arrays of nodes as props** (`AppBar.actions`): the renderer maps `FuseNode` elements of an array to `{_node: id}` and `applyOps` resolves them. This is the same change the `slivers` branch made; I ported it in the same shape.
3. **`_component` attribution.** The published `solid-fuse` dist is minified, so in a consumer bundle `View` is named `We`, and a `<view>` created inside it reports `_component: "We"`. Children are evaluated lazily inside the wrapper, so anything nested in a `<View>` was attributed to `We` too. I added `markWrapper`: solid-fuse's own wrappers and generated wrappers are transparent, and a node is attributed to the app component that used them. This is a bug fix that is independent of codegen.
4. **Adapter errors.** `_FuseErrorElement` only catches errors thrown inside `FuseNodeWidget.build`. A generated adapter is its own `StatelessWidget`, built later, so a decode error became a framework exception and Flutter's red `ErrorWidget`. Generated adapters now wrap the constructor call and return the dev error box (`fuseBuildError`).

Also: the CLI's Vite config now aliases `~` to `src/` (apps had only the tsconfig path), `fuse link` adds the generated registrar to `fuse_packages.dart`, and `fuse build` gained `--js-only` and `--dev`.

## Dev-mode validation

**Decision: on the JS side, before the op is sent.** That is where the mistake is made and where the component is known; the manifest does not have to be compiled into the binary; and it costs nothing in release. The Dart adapters still throw on values they cannot decode, as a backstop, and the comparison below shows why Dart-side validation would be the worse primary: it does not know the prop name without more generated code.

How it is wired: `cli/native-manifest-plugin.ts` appends `import "virtual:fuse-native-manifests"` to the app entry in `vite serve` and in development-mode builds. The virtual module registers each manifest (docs stripped) with `registerNativeManifest`, which installs a hook in the renderer's `setProperty`. App code never imports it. In a production build nothing is injected and the validator is tree-shaken.

It checks: unknown prop (with the nearest name), a prop that exists in Flutter but was not bridged (with the reason), wrong primitive type, bad enum value, bad constant name, unknown `$` variant, unknown or missing field inside a data object, missing required prop, and widget / handle / callback kinds. Friendly forms (`"#3366ff"`, `16`) are accepted through named matchers carried in the manifest.

Output from the integration test, where `<Broken/>` spreads props typed `any`:

```
[fuse] <percent_indicator.LinearPercentIndicator> in <Broken>: unknown prop "lineHeigth". Did you mean "lineHeight"?
[fuse] <percent_indicator.LinearPercentIndicator> in <Broken>: prop "percent" expects number, got "0.5".
[fuse] <app.RatingBadge> in <Broken>: prop "tone" expects BadgeTone (neutral | positive | negative), got "positiv". Did you mean "positive"?
[fuse] <app.RatingBadge> in <Broken>: missing required prop "label" (string).
[fuse] <percent_indicator.LinearPercentIndicator> in <Broken>: prop "progressColor" expects Color (NativeColorInput | "Colors.transparent" | "Colors.black" | "Colors.black87" | … 97 more | {…} | { $: "from" } | … 7 more), got "Colors.tael". Did you mean "Colors.teal"?
[fuse] <percent_indicator.LinearPercentIndicator> in <Broken>: prop "padding" has unknown EdgeInsets variant $: "symetric". Did you mean "symmetric"?
[fuse] <percent_indicator.LinearPercentIndicator> in <Broken>: prop "padding.horizontl" is not a field of EdgeInsets { $: "symmetric" }. Did you mean "horizontal"?
[fuse] <percent_indicator.LinearPercentIndicator> in <Broken>: prop "onPercentValue" exists on Flutter's LinearPercentIndicator but is not bridged (callback/sync-return).
```

(The `NativeColorInput` wording was changed after this capture to `"#rrggbb" | "red" | {r,g,b}`.)

For the same mistakes, the Dart backstop alone says:

```
[Fuse] <percent_indicator.LinearPercentIndicator> #39 in <Broken>: type 'String' is not a subtype of type 'num?' in type cast
[Fuse] <app.RatingBadge> #40 in <Broken>: Invalid argument (name): No enum value with that name: "positiv"
[Fuse] <app.RatingBadge> #41 in <Broken>: Invalid argument(s): RatingBadge: required prop "label" is missing
[Fuse] <percent_indicator.LinearPercentIndicator> #42 in <Broken>: Invalid argument(s): Cannot decode Color from String: Colors.tael
```

and says nothing at all about the misspelt prop, the unknown field or the unbridged callback.

Limits:

- Only generated tags are validated. The nine built-ins have no manifest, so `<View paddng={8}>` is still silent. Hand-declared manifest fragments for them (architecture step 3) would plug into the same hook.
- No source location. With a dev server attached the error goes through `reportDevError`, which is source-mapped, but that path was not run.
- The error names the nearest app component, not the JSX line.
- Widget slots accept any node: a `<Text>` passed as `Scaffold.appBar` is valid to both tsc and the validator.

## Agent-facing catalogue

Two files, both derived from the manifests, plus a command for detail.

`src/_generated/NATIVE.md` (full mode, used up to 60 widgets):

```markdown
## percent_indicator 4.2.5

`import { CircularPercentIndicator, LinearPercentIndicator } from "~/_generated/percent_indicator"`

### CircularPercentIndicator

- children: none
- props: `percent: number = 0`, `radius*: number`, `lineWidth: number = 5`, `startAngle: number = 0`, `fillColor: Color = Dart `Colors.transparent``, ..., `circularStrokeCap: CircularStrokeCap = "butt"`, `center: FuseElement`, `onAnimationEnd: () => void`, ...
- not bridged: `onPercentValue` (callback/sync-return)

### Enums
- `CircularStrokeCap`: "butt" | "round" | "square"

### Data types
- `Color`: NativeColorInput | "Colors.transparent" | "Colors.black" | … (100 constants) | {…} | {$:"from"} | … (9 variants)
```

Above 60 widgets it switches to an index: one line per widget (`- ListTile: A single fixed-height row that typically contains some text as well as a leading or trailing icon.`) with a pointer to `fuse catalog <Widget>`.

`src/_generated/native.catalog.json`: one string per prop.

```json
{ "tag": "app.RatingBadge", "doc": "A pill showing a label and a star count.", "children": "child",
  "props": { "label": "string*", "stars": "number = 0", "tone": "BadgeTone = \"neutral\"", "color": "Color",
             "onTap": "() => void", "onRated": "(value: number) => void" } }
```

`fuse catalog Badge` prints the props with their doc sentence and a one-line summary of every type they reference.

## Measurements

Sizes from `experiments/interop/e2e/measure.ts`. Token counts are bytes / 4.

**Per widget, in the example app** (first-paragraph docs):

| Unit | Widgets | Manifest | TS module | of which shared types | Dart adapters + codecs | Catalogue (md) |
|---|---:|---:|---:|---:|---:|---:|
| `app` (1 widget with a `Color` and an `EdgeInsetsGeometry` prop) | 1 | 9.9 KB | 7.2 KB | 5.9 KB | 16.1 KB | 1.5 KB |
| `percent_indicator` | 2 | 25.0 KB | 18.5 KB | 11.1 KB | 31.0 KB | 3.8 KB |
| `flutter` (5 widgets) | 5 | 70.4 KB | 47.7 KB | 30.6 KB | 73.4 KB | 8.0 KB |

A widget's own interface is small (1.0 to 4.3 KB with docs). The shared value types dominate small units: one `Color` prop drags in 100 colour constants and 9 constructor variants, in both TS and Dart, and each unit carries its own copy.

**All of material.dart** (498 of 604 widget constructors, 4,356 props, 217 data types, 120 enums):

| Artefact | Size | gzip | approx. tokens |
|---|---:|---:|---:|
| Manifest as committed (first-paragraph docs) | 1,061 KB | 144 KB | 272k |
| Manifest, minified, no docs | 684 KB | 71 KB | 175k |
| TS module with docs | 820 KB | 135 KB | 210k |
| TS module without docs | 488 KB | 64 KB | 125k |
| Validation view (dev prelude) | 491 KB | 53 KB | n/a |
| `NATIVE.md`, full (every prop) | 255 KB | 43 KB | 65k |
| `NATIVE.md`, index (name + one sentence) | 48 KB | 12 KB | 12k |
| Dart adapters + codecs | 770 KB (16,140 lines) | | |

Per widget across material: TS mean 1,354 B / median 993 B / max 11,645 B (`GestureDetector`) with docs; mean 732 B without. Catalogue: 525 B per widget in full mode, about 96 B in index mode.

The TS module is larger than the 377 KB `.d.ts` reported in 02 because it now contains one `nativeComponent` line and one doc line per widget.

**tsc cost** (`tsc --extendedDiagnostics`, TypeScript 5.9.3, a small `.tsx` importing the module, machine under load):

| Generated module | Lines of TS | Types | Memory | Total time |
|---|---:|---:|---:|---:|
| 5 widgets | 1,118 | 1,664 | 151 MB | 2.3 s |
| all of material (498) | 22,427 | 8,275 | 170 MB | 4.0 s |

So generating everything costs roughly 1.7 s and 20 MB per full type-check. That is tolerable; the argument against generating everything is binary size and the catalogue, not tsc. Editor (tsserver) latency was not measured.

**Generation time**: `fuse gen` for the example app (3 units, 8 widgets) took 37 s wall with load average 4.6; the analyzer's library load was 14 to 24 s of that, and `dart run` start-up most of the rest. All of material took 28 s. `fuse gen --check` takes 0.4 s because it reads only `package_config.json`, the config and file hashes.

**Bundle**: release bundle of the example app is 78 KB and contains no validator or manifest. The `--dev` bundle is 207 KB (Solid dev build plus validator plus three validation views). `solid-fuse`'s `dist/index.js` grew from 15.3 KB to 23.4 KB.

Not measured: binary size of the generated adapters, QuickJS parse time of a large validation view, per-prop validation cost.

## Version skew and regeneration

### `fuse.lock`

```json
{
  "lockVersion": 1,
  "generator": "0.1.0",
  "flutter": "3.50.1",
  "dart": "3.14.0",
  "units": {
    "app":               { "version": "src-ac753402c96b", "config": "bf2ba599578a49eb", "manifest": "<sha256>", "widgets": 1 },
    "flutter":           { "version": "3.50.1",           "config": "4fb8c7df9fae5ae0", "manifest": "<sha256>", "widgets": 5 },
    "percent_indicator": { "version": "4.2.5",            "config": "cf111aab5a2f26c2", "manifest": "<sha256>", "widgets": 2 }
  },
  "fingerprint": "<sha256 of generator + flutter + units>"
}
```

- `version`: the resolved pub version (from the package's `pubspec.yaml` via `package_config.json`), the Flutter version (`bin/cache/flutter.version.json`), or for `app` a hash of the Dart sources.
- `config`: hash of the unit's allow-list and libraries.
- `manifest`: hash of the committed manifest file, which catches hand edits and half-committed output.
- `fingerprint`: the value an OTA compatibility check would start from (not used yet).

### What `fuse dev` / `fuse build` do on mismatch

Implemented in `ensureGenerated` (`cli/gen.ts`), called before `fuse link`: print each reason, regenerate, print the API diff, say that a native rebuild is needed, continue. `fuse gen --check` prints the same reasons and exits 1.

Detected: generator version changed, Flutter version changed, package version changed, allow-list changed, app widget sources changed, unit added or removed, manifest edited or missing, generated TS or Dart missing.

Run for real after adding a parameter to `rating_badge.dart` and calling `fuse build --js-only`:

```
[fuse] Generated native bindings are out of date:
  - app: Dart widget sources changed
[fuse] Regenerating (fuse gen)...
API changes since the last generation:
  + app.RatingBadge.maxStars: number
[fuse] Native bindings regenerated. Dart adapters changed, so the app needs a native rebuild (not just a hot reload).
```

Specified, not built: a watcher inside a running `fuse dev` (today the check runs once at start-up), and choosing between hot reload, hot restart and full rebuild.

### Upgrade safety, demonstrated on a real package

`badges` 2.0.3 to 3.x moved eleven `Badge` constructor parameters into `BadgeStyle` / `BadgeAnimation`. `experiments/interop/e2e/skew-demo.sh` (output in `skew-demo.out.txt`):

```
$ fuse add badges:2.0.3
badges 2.0.3: 2 widget(s) generated
  Badge: 16 props, children (child)

$ tsc --noEmit        # call site: <Badge badgeColor="red" elevation={0} toAnimate={false} shape="circle" ...>
ok, no errors

$ (cd dart && flutter pub add 'badges:^3.1.2')
> badges 3.2.0 (was 2.0.3) (4.0.1 available)

$ fuse gen --check    # what CI and `fuse dev` see
Generated native bindings are out of date:
  - badges 2.0.3 -> 3.2.0
exit code 1

$ fuse gen
API changes since the last generation:
  - badges.Badge.badgeColor: prop removed
  - badges.Badge.elevation: prop removed
  - badges.Badge.toAnimate: prop removed
  - badges.Badge.shape: prop removed
  ... (11 removed)
  + badges.Badge.badgeStyle: BadgeStyle
  + badges.Badge.badgeAnimation: BadgeAnimation

$ tsc --noEmit
src/skew-demo.tsx(8,7): error TS2322: Type '{ ...; badgeColor: string; elevation: number; toAnimate: boolean; shape: string; ... }' is not assignable to type 'BadgeProps'.
  Property 'badgeColor' does not exist on type 'BadgeProps'.
```

Two observations. tsc reports only the first offending prop per element, so the API diff is the more useful output for an agent. And the diff is computed from the old committed manifest, which is another reason to commit it.

## Friction

### Things that were awkward to build or use

1. **Generation is slow.** About 35 s per `fuse gen`, every unit regenerated every time, because each run starts a Dart VM and loads Flutter's element model. Changing one line in an app widget costs the same. A long-lived generator process (as 04 proposed) or at least a compiled snapshot is needed before this is pleasant.
2. **Shared value types are duplicated per unit.** `decColor` exists three times in the example app, and a one-widget unit is 16 KB of Dart because of it. One generation run per app with a shared codec file (`_generated/fuse_types.g.dart` / `types.ts`) would fix it, at the cost of every unit's output depending on every other unit.
3. **A unit's output can depend on which other packages are loaded.** Tagged unions are built from every known subclass, so if a pub package subclasses a Flutter type, the `flutter` unit grows an arm that imports that package. Not observed in this run; it follows from the rule.
4. **Name collisions with solid-fuse and Solid.** `Text`, `Stack`, `Icon`, `GestureDetector` and, worst, `Switch` (Solid's control flow). `import * as F from "~/_generated/flutter"` is the comfortable spelling, and docs should say so.
5. **`fuse add` edits `fuse.config.ts` as text.** It handles the three shapes it expects and otherwise prints what to add. It also has to work around the config module being cached after the first `import()` in the same process. A proper TS-AST edit, or keeping the package list in a data file, would be more robust.
6. **`# fuse-managed` dependencies are deleted by `fuse link`** when no npm package claims them. `fuse add` therefore uses `flutter pub add`, which writes a real constraint. There is no `fuse remove`.
7. **`JSX.Element` is `any`.** Widget-typed props (`title`, `leading`, `appBar`) and `children` are effectively untyped, so `<F.Text><F.Text/></F.Text>` compiles. This is existing solid-fuse behaviour that generated types inherit.
8. **The generator's version must be bumped by hand.** Changing the generator's code without changing `generatorVersion` is invisible to the lock. Hashing the generator's sources would be safer.
9. **First run writes into `node_modules`.** The generator runs `dart pub get` in `node_modules/solid-fuse/gen` the first time; a yalc push wipes it.
10. **Flutter 3.50 deprecates `package:flutter/material.dart`** in favour of `package:material_ui`. Generated files carry an ignore. When the libraries actually move, the allow-list resolution and every `library` URI in the manifest change.

### Where the 1:1 API is unpleasant from JSX

All of these type-check as shown in `experiments/interop/e2e/friction.tsx`, against a generation of all of material.

- **Tagged unions.** `decoration={{ $: "BoxDecoration", color: "#fff", borderRadius: 12, border: { $: "all", color: "#0002" } }}`. Abstract Dart types force the tag, nested ones force it again, and `decoration={{ color: "#fff" }}` is a type error. The built-in `View` takes the untagged form. A default arm per abstract type (override data, not a generator rule) would remove most of it.
- **`Text`.** `<F.Text>Hello</F.Text>` and `<F.Text data="Hello" />` both work, because the positional `data` is filled from text children. Styling is `style={{ fontSize: 18, fontWeight: 700 }}`, where the built-in `Text` has flat `fontSize` / `fontWeight`. Two `Text`s with different prop shapes in one app is a trap.
- **`PreferredSizeWidget`.** Any element is accepted and wrapped in `PreferredSize(kToolbarHeight)`. It rendered correctly for `AppBar`; a taller bar needs a `preferredHeight` prop on the slot node, which nothing types.
- **`flex`.** On `Expanded` / `Flexible` it is Flutter's integer; on every other single-child widget it is solid-fuse's layout object. The Flutter parameter wins and the type system does at least reject the wrong one.
- **Generics.** `DropdownButton.value` and the argument of `onChanged` are both `unknown` and not related; callers cast.
- **Stateful styling.** `style={{ backgroundColor: { $: "WidgetStatePropertyAll", value: "red" } }}` is the only derivable form of `WidgetStateProperty`.
- **Several callback arguments arrive as a tuple**: `onReorderItem={([oldIndex, newIndex]) => ...}`.
- **Slots that are not called `child`.** `SliverPadding.sliver` comes out as a prop (`sliver={<X/>}`) rather than JSX children. "Exactly one `Widget` parameter and no `child`/`children`" should map to children by rule instead of the two hand-written hints.
- **Required-but-nullable parameters** (`ElevatedButton.onPressed`) become optional, so forgetting them compiles and renders a disabled button.
- **Deprecation on the field, not the parameter**, is missed: `LinearPercentIndicator.linearStrokeCap` is still emitted.

### A thin JS layer in practice

`examples/gen_e2e/src/ui/gauge.tsx` (44 lines, runs in the integration test):

```tsx
export function Gauge(props: GaugeProps) {           // { value: 0..100, size?, tone?: "info" | "good" | "warn", label? }
  const size = () => props.size ?? 96;
  const tone = () => TONES[props.tone ?? "info"];
  return (
    <CircularPercentIndicator
      radius={size() / 2}
      lineWidth={Math.max(4, size() / 12)}
      percent={Math.min(1, Math.max(0, props.value / 100))}
      progressColor={tone().progress}
      backgroundColor={tone().track}
      circularStrokeCap="round"
      animation animateFromLastPercent animationDuration={250}
      center={<Text fontSize={size() / 4} fontWeight="bold">{`${Math.round(props.value)}%`}</Text>}
      footer={props.label ? <Text>{props.label}</Text> : undefined}
    />
  );
}
```

It reshapes props (a 0 to 100 value, a diameter, a tone name), supplies defaults, and clamps so a caller cannot trip Flutter's `percent` assert. It adds no Dart and no node beyond what the raw widget needs, and it is typed against the generated props, so the badges-style upgrade breaks it at compile time in one place rather than at every call site. This is the layer that could ship over the air. It is worth having for exactly the widgets an app uses a lot; writing one for every generated widget would recreate the double authoring that generation removed.

### How much hand-written Dart could go

I ran the generator over the Flutter widgets that the `slivers` branch wraps by hand, and over the Flutter equivalents of the built-ins.

`slivers` branch (`/home/claude/wt/slivers`, about 1,650 lines under `widgets/slivers/` plus tabs):

- **Generates completely, 1:1:** `SliverCrossAxisGroup`, `SliverMainAxisGroup`, `SliverToBoxAdapter`, `PinnedHeaderSliver`, `SliverConstrainedCrossAxis`, `SliverCrossAxisExpanded`, `SliverFillRemaining`, `SliverIgnorePointer`, `SliverPadding`, `SliverOpacity`, `SliverAnimatedOpacity`, `SliverSafeArea`, `DecoratedSliver`, `SliverResizingHeader`, `SliverFloatingHeader`, `FlexibleSpaceBar`, both reorderable drag-start listeners, `SliverGrid.count` / `.extent`, `SliverList.list`, `TabBarView`, `Tab`. About 20 files and 450 lines.
- **Generates with a caveat:** `SliverAppBar` (37 props; loses `onStretchTrigger`, a `Future` callback, and the hand-written `'light' | 'dark'` shorthand for `systemOverlayStyle`), `CustomScrollView`, `CupertinoSliverNavigationBar` (loses `heroTag`), `TabBar` (loses `splashFactory`), `SliverOverlapAbsorber` / `Injector` (adapter generated, the handle class is still hand-written). About 370 lines.
- **Does not generate:** `SliverList`, `SliverGrid`, `SliverFillViewport` (delegates), `SliverLayoutBuilder`, `SliverReorderableList`, `NestedScrollView` (builders), `SliverPersistentHeader` (abstract delegate), `RefreshIndicator` and `CupertinoSliverRefreshControl` (`Future` callbacks), plus `sliver_support.dart`. About 430 lines, and these are the files with the real logic.

So roughly half the lines and two thirds of the files, which matches 04's estimate (23 of 39). Two things would have to be true first: the "single non-child Widget slot maps to children" rule, and `_functionCallAsync` (already on `slivers`) classified as a generated kind so `Future<void>` callbacks stop being omitted.

Built-ins on main (1,057 lines in `dart/lib/src/widgets/`): `Stack`, `Positioned` and `Icon` (94 lines) generate 1:1. `GestureDetector` generates all 64 parameters with payload encoders and could replace the 239-line hand serialiser, but the payload shapes would change (`{dx, dy}` objects, enum names), which is a breaking change for existing apps. `View`, `Text`, `TextField` and `ScrollView` are curated compositions and should stay hand-written, as 04 argued.

## Open problems

- **Dart adapters do not come from the manifest.** To make them, the manifest would have to carry Dart source for defaults (`const EdgeInsets.symmetric(vertical: 6.0, horizontal: 12.0)`), import prefixes and constructor argument order. That is feasible, and it is what pre-generated library manifests (npm Fuse packages shipping adapters) would need. Not attempted.
- **No incremental generation and no watcher.** See friction 1.
- **Hot reload.** A changed adapter body should hot reload; a new registration needs a hot restart; a new pub package needs a rebuild. `fuse dev` does not distinguish them, and none of it was run.
- **Validation covers only generated widgets**, and has no source location.
- **Builders, sync callbacks, delegates** are unchanged from 02: omitted and reported. `fuse add` prints them, the catalogue lists them, and the validator explains them when someone passes one. That is the honest limit of the approach.
- **Binary size of real adapters** is still unmeasured (04's figures are synthetic).
- **Handles.** Adapters accept `FuseHandle<"ScrollController">` props, but no handle class is generated.
- **Catalogue at scale.** 255 KB for all of material is too much to put in an `AGENTS.md`; the 48 KB index plus `fuse catalog <Widget>` is the workable shape, and it argues for the allow-list on agent-context grounds as well as binary size.

## Smallest first PR

In order, each useful alone:

1. **Two fixes that are independent of codegen:** `markWrapper` (correct `_component` when the dist is minified) and the default `~` alias in the CLI's Vite config. About 40 lines.
2. **`fuse gen` for app widgets and pub packages**, without the Flutter allow-list, validation or catalogue:
   - `packages/solid-fuse/gen/` (generator), `dart/lib/gen_support.dart`;
   - `cli/gen.ts`, `cli/gen-emit.ts` (TS module only), `cli/add.ts`, the `fuse_packages.dart` hook in `cli/link.ts`, `native` in `src/config.ts`;
   - `nativeComponent` and array-of-nodes props in the renderer and `applyOps` (shared with `slivers`, so land it once);
   - `fuse.lock` with `fuse gen --check`, because committed output without a staleness check will rot;
   - `examples/gen_e2e` and its integration test as the regression test.
   
   This is the step that removes double authoring for new work: a plain Flutter widget in `dart/lib/fuse/` becomes usable from JSX with types.
3. **Then** the Flutter allow-list (same code, but it needs the naming-collision and `Text`/`flex` decisions above), dev validation plus manifest fragments for the built-ins, and the catalogue.

Before step 2 merges I would fix generation time (a snapshot at least) and move shared codecs into one file per app.

## Diff summary

`git diff 95e4e33 spike/e2e`: 73 files, about 10,800 insertions, of which about 6,600 are generated output and Flutter's Linux runner template committed in the example app.

Generator (Dart), `packages/solid-fuse/gen/`:

| File | What |
|---|---|
| `pubspec.yaml`, `.gitignore` | Standalone package `fuse_gen`, `analyzer: 14.7.0` |
| `bin/fuse_gen.dart` (new) | Job-file entry point: one analyzer load, several units, writes `<unit>.fuse.g.dart` and `<unit>.manifest.json`, diff-friendly manifest printer |
| `lib/src/gen.dart` (from the spike, modified) | TS emission removed; manifest emission added (`mt`, `mOut`, `_mData`, `_mPayload`); tags `<unit>.<Component>`; adapters wrapped in `try`/`fuseBuildError` |
| `lib/src/overrides.dart` (modified) | Codec overrides gain `accepts` (runtime matcher names for the validator) |
| `lib/src/classify.dart`, `lib/src/world.dart` | Copied from the spike unchanged |

CLI (TypeScript), `packages/solid-fuse/cli/`:

| File | What |
|---|---|
| `gen.ts` (new) | `fuse gen`, `--check`, unit resolution from config and `package_config.json`, lock file, skew detection, `ensureGenerated`, generated registrar |
| `gen-emit.ts` (new) | Manifest to TS module, catalogue (markdown full / index, JSON), validation view, `describeWidget`, `diffManifests` |
| `add.ts` (new) | `fuse add`, config text edit, survey output |
| `catalog.ts` (new) | `fuse catalog [Widget] [--json]` |
| `native-manifest-plugin.ts` (new) | Vite plugin that injects the dev validation prelude |
| `gen.test.ts` (new) | 14 bun tests for the emitters, diff and config edit |
| `index.ts`, `link.ts`, `dev.ts`, `config.ts`, `build/app.ts` | Register commands; call `registerFuseGenerated`; `ensureGenerated` before link; `~` alias and plugin; `--js-only` / `--dev` |

Runtime, `packages/solid-fuse/`:

| File | What |
|---|---|
| `src/renderer.ts` | `native`, `nativeComponent`, `markWrapper`, component stack, validator hook, array-of-nodes props |
| `src/native.ts` (new) | Types generated modules import (`FuseElement`, `FuseFlex`, `FuseHandle`, `NativeColorInput`, ...) |
| `src/native-validate.ts` (new) | Manifest-driven dev validator, nearest-name suggestions |
| `src/index.ts`, `src/config.ts` | Exports; `native` config types; built-in wrappers marked |
| `dart/lib/gen_support.dart` (new, from the spike) | Helpers generated adapters call, plus `fuseBuildError` |
| `dart/lib/src/runtime.dart` | Resolve `{_node}` inside list props; dispose them with the node |
| `package.json` | `gen` added to published `files` |

Example and experiment files:

| File | What |
|---|---|
| `examples/gen_e2e/` (new) | App: config, `dart/lib/fuse/rating_badge.dart`, `src/index.tsx`, `src/ui/gauge.tsx`, committed `_generated/` output and `fuse.lock`, Linux runner, `dart/integration_test/generated_widgets_test.dart` |
| `experiments/interop/e2e/` (new) | `skew-demo.sh` + output, `e2e-test.out.txt`, `measure.ts`, `friction.tsx`, README |
| `packages/docs/content/docs/extending/generated-widgets.mdx` (new), `meta.json` | Draft user doc, marked experimental |
| `package.json` (root) | `overrides` pinning the Solid packages, as the brief suggested |

## How to reproduce

```bash
cd /home/claude/wt/e2e && bun install && (cd packages/solid-fuse && bun run build)
export PATH=/opt/flutter/bin:$PATH
cd examples/gen_e2e
bun fuse gen && bunx tsc --noEmit
bun fuse build --js-only --dev
(cd dart && xvfb-run -a flutter test integration_test/generated_widgets_test.dart -d linux)   # first run builds the engine
(cd ../../packages/solid-fuse && bun test cli/gen.test.ts)
../../experiments/interop/e2e/skew-demo.sh
```
