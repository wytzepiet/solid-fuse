# Report 13: cold start and a prerendered first screen

Research spike on branch `spike/coldstart`. Nothing here is production code. Every
number marked "measured" comes from the raw files under `results/r13/`; everything
else is labelled as estimated or as read from source.

## 0. Setup and how to read the numbers

- Machine: Linux x64 VM, 4 vCPU (Xeon 2.1 GHz), Flutter release build, one Xvfb for
  all launches, software rasteriser (llvmpipe). No phone was measured.
- The machine was shared with another agent during the run. The load average
  recorded per file was between 0.5 and 3.7. Ranges are therefore wide; differences
  under roughly 10 % of a median should be read as "not distinguishable".
- "Cold" means a new process per launch. The OS page cache was warm (the files had
  been read before) except in the one `evict` run in section 2.7.
- In-app numbers: 12 launches per configuration (3 rounds of 4, rounds interleaved
  over all configurations), median with (min–max). Driver: `dart/lib/cold.dart`,
  runner `tools/cold.sh`, matrix `tools/cold-all.sh`, tables `tools/cold-tables.sh`.
- Harness numbers: a Rust test binary (`libfjs/src/tests/cold_harness.rs`) that runs
  the same engine calls without Flutter, 20 repetitions, each a new process. It is
  used where the app cannot separate phases (compile vs evaluate, per-module time).
- Instrumentation is inert by default: `FuseStartup.on` is false, and the per-module
  marks exist only in a separately built "marked" twin of the bundle
  (`tools/mark-bundle.py`), never in the bundle the app timings use.
- `proc→main` is taken from a wall-clock stamp made by the shell immediately before
  `exec` to the first line of Dart `main()`. Everything after is from Dart's
  monotonic clock.
- A first full pass was discarded: I ran a page-cache drop and edited a script while
  it was running, which aborted it. All `-a` in-app files are from the clean rerun.
- The bytecode cache had never worked in this VM (also not in the runs of earlier
  reports): `path_provider` on Linux runs `xdg-user-dir`, which is not installed, so
  every launch compiled. `tools/cold.sh` puts a shim on `PATH`.

Raw data: `results/r13/cold-<variant>-<config>-a.txt`, `harness-b-*.txt`,
`vite-b.txt` (and an earlier, equally valid `harness-a-*`, `vite-a`). Generated
tables: `results/r13/tables-a.md`, `tables-a-extra.md`, `tables-b-harness.md`.

Variants: `small` (26 nodes, 78 KB bundle), `n200` and `n1000` (the perf_bench
bundle, 140 KB, with a first screen of 197 and 997 nodes), `static-live` (a page of
90 literal cards, 992 nodes, 195 KB bundle) and `static` (the same page baked at
build time, section 4).

## 1. Cold-start breakdown (measured)

### 1.1 From process start, as the framework ships today

"Today" means: `await FuseRuntime.create()`, `await start()`, then `runApp`, with the
on-device bytecode cache. Medians in ms, (min–max), n = 12 each.

| phase | owner | small | n200 | n1000 |
|---|---|---:|---:|---:|
| process start → Dart `main()` | Flutter, GTK, Dart VM | 214 (175–240) | 210 (171–260) | 203 (168–233) |
| `initFjs()` (load `libfjs.so`, bridge init) | ours | 3.2 | 3.3 | 3.1 |
| engine create (runtime + context) | ours | 2.1 | 2.1 | 2.0 |
| engine init (built-ins, polyfills) | ours | 3.2 | 3.2 | 3.4 |
| host seed + console shim + start driver | ours | 4.2 | 4.2 | 4.2 |
| read `bundle.js` from the asset bundle | ours (Flutter API) | 3.3 | 4.0 | 3.9 |
| sha256 of the bundle | ours | 1.5 | 3.2 | 1.8 |
| find cache dir + read cached bytecode | ours (`path_provider`) | 20.1 | 23.5 | 22.0 |
| evaluate bytecode until Dart has the result (includes first mount) | ours | 6.2 | 13.4 | 33.1 |
| decode + apply first op batch | ours | 0.08 | 0.45 | 2.0 |
| **`main()` → `runApp`** | ours | 47.5 (42–56) | 61.2 (48–69) | 79.2 (57–86) |
| `runApp` → start of first frame (root widget inflated) | Flutter, on our tree | 2.9 | 8.6 | 17.9 |
| first frame: build, layout, paint (UI thread) | Flutter, on our tree | 14.3 | 24.9 | 46.8 |
| **`main()` → first content frame done** | | 65.2 (59–74) | 94.3 (80–112) | 138 (120–164) |
| **process start → first content frame done** | | 276 (234–309) | 307 (262–342) | 349 (290–382) |
| process start → a tap is applied on screen | | 282 (238–317) | 312 (272–346) | 363 (301–395) |

On the very first launch after install there is no cached bytecode. The row "find
cache dir + read" drops to 8–9 ms (a miss) and a "compile + write cache" row of
35.5 (31–43), 50.5 (40–75) and 57.2 (51–68) ms appears. `main()` → content is then
87.9, 131 and 188 ms.

Notes on attribution:

- `proc→main` is not ours, is the same in every configuration (medians 190–232 ms
  over 47 files) and is the noisiest row. I did not split it further (no strace
  run). `libfjs.so` (10 MB) is not linked into the runner; it is loaded inside
  `initFjs()`, so it is not part of this row.
- Rasterisation happens after "first content frame done", on the raster thread.
  The `FrameTiming` based figure (`proc→raster done*` in the tables) is 60–80 ms
  later with llvmpipe and has outliers above 1.5 s; it is not representative of a
  GPU and I do not use it.
- "runApp → start of first frame" scales with node count. This fits Flutter
  attaching and inflating the root widget in a timer between `runApp` and the
  warm-up frame (my reading of `WidgetsBinding`, not separately measured).
- The 20–23 ms for the cache lookup is mostly `getApplicationDocumentsDirectory()`.
  On Linux that spawns a process (`xdg-user-dir`). On Android and iOS it is a
  platform-channel call; its cost there was not measured.
- A fixed first-frame cost of roughly 10–14 ms exists even with 26 nodes.

### 1.2 Inside the JS engine (harness, measured, n = 20)

| phase | small | n200 | n1000 |
|---|---:|---:|---:|
| runtime + context create | 0.5 | 0.45 | 0.45 |
| built-ins and polyfills (`init`, set "all") | 1.8 | 1.7 | 1.7 |
| host seed + console shim | 0.24 | 0.22 | 0.25 |
| compile source to bytecode (first launch only) | 11.1 (7.7–13.5) | 15.4 (13.8–22.0) | 21.4 (14.0–23.7) |
| bytecode validation pass (fjs does this before every load) | 1.1 | 1.7 | 1.5 |
| read bytecode into the engine + thread hop | 1.05 | 1.65 | 1.4 |
| module top level: `@solidjs/signals` | 0.20 | 0.17 | 0.17 |
| module top level: `solid-js` | 0.02 | 0.02 | 0.02 |
| module top level: `solid-fuse` | 0.12 | 0.10 | 0.10 |
| module top level: all app modules | 0.01 | 0.25 | 0.25 |
| first mount (`render()` until the batch is ready) | 0.58 (0.36–0.73) | 5.2 (3.4–9.8) | 21.9 (15.3–27.8) |
| bridge, JS side (stringify + call) | 0.04 | 0.05 | 0.22 |
| evaluate from source text instead (compile + run, for comparison) | 11.4 | 21.4 | 44.7 |

Two things follow from comparing 1.1 with 1.2.

1. Module evaluation is negligible (under 0.6 ms in total). With bytecode, JS time
   at start is the first mount and nothing else worth optimising.
2. Engine create + init + seed is 2.6 ms of work in the harness but 9.5 ms in the
   app. The difference is the five sequential async Dart↔Rust round trips that
   `createEngine` makes. One combined boot call would recover most of it. This is an
   estimate from the two measurements; I did not prototype the combined call.

### 1.3 Summary of who owns what (n1000, cached path, `main()` → content = 138 ms)

About 45 ms is engine boot and bundle loading (ours, largely avoidable), 33 ms is
bytecode evaluation of which about 22 ms is the first mount in JS (ours), 2 ms is
decode and apply (ours), and about 65 ms is Flutter inflating, laying out and
painting the widgets our nodes describe. Before all of that, about 210 ms belongs to
Flutter, GTK and the Dart VM.

## 2. Levers (each measured unless stated)

### 2.1 Table

`main→content` is `main()` to first content frame done. Baseline is the cached path
of section 1.1 (65.2 / 94.3 / 138 ms).

| lever | effect (small / n200 / n1000) | code size | risk | landable | character |
|---|---|---|---|---|---|
| Bytecode shipped as an asset (`bundle.bc`, `QuickJsConnection.bytecodeAsset`) | `main→content` 38.7 / 67.0 / 126 ms, that is −27 / −27 / −12 ms against later launches and −49 / −64 / −62 ms against the first launch. No source read, hash, cache lookup or compile. | about 60 lines Dart, about 40 lines CLI; needs a host build of the engine at `fuse build` time | Bytecode is valid only for the exact engine build (section 2.5). The asset must be produced by the same fjs revision that ships. Falls back to source on load error (tested by hand, not by a unit test). | Yes, behind the build flag, after a version stamp is added. | Principled. |
| Skip the validation pass on trusted bytecode (`evaluate_script_bytecode_unchecked`) | −1.1 to −1.7 ms; −10.5 ms for a 735 KB bytecode file | 15 lines Rust | QuickJS does not verify bytecode; a corrupt file can crash the process. Acceptable for an asset inside a signed app, not for a cache file. | Harness only at present; not exposed to Dart. | Principled for assets. |
| Fewer built-ins (`COLD_BUILTINS=min`) | engine init 3.0 → 1.8 ms in the app (harness 1.88 → 0.46 ms); end to end not distinguishable from noise | config only | Apps that use `fetch`, `URL`, timers and so on need those modules; a wrong set fails at run time. | As an opt-in list, yes. Lazy loading on first use was not prototyped. | Principled, small. |
| One combined boot call instead of five round trips | estimated −5 to −7 ms (section 1.2) | not written | low | Not prototyped. | Principled. |
| Evaluate source text in release (no cache, no bytecode) | 51.2 / 89.7 / 131 ms: faster than the cached path on this machine, because the cache lookup costs 20 ms here | flag | Compiles on every launch (11–21 ms). Depends on how expensive `path_provider` is on the target. | Not recommended; listed because it shows that the cache as built is not a clear win. | — |
| `runApp` first, engine after (no prerender) | 53.4 / 93.2 / 137 ms with the bytecode asset: worse than awaiting `start()` (38.7 / 67.0 / 126) | — | — | No. An empty first frame is built and then the real one. | — |
| Vite `minify` | JS 78.1 → 39.1 KB (small), 140.5 → 74.2 KB (bench); bytecode only −5.5 % and −3.7 %; no measurable change in evaluation time | config | Stack traces lose names unless a source map is kept off device. | Yes for the JS asset. Irrelevant once bytecode ships, except for the fallback copy. | Principled. |
| Vite `target: esnext` | JS −2 %, bytecode −1 %, time unchanged | config | none seen | Harmless, no gain. | — |
| Tree shaking (default on) | turning it off costs +20 % JS and +18 % bytecode; `moduleSideEffects: false` produced byte-identical output | — | — | Already in effect. | — |
| Remove `bundle.js.map` from release assets | −438 KB app size for the bench bundle (file size read from the release bundle; not a start-up effect) | few lines CLI | none | Yes. The whole `assets/js/` directory is listed in the pubspec, so the map ships today. | Principled. |
| Keep large data out of the start bundle | `small-icons` (a 480 KB data module): 656 KB JS, 735 KB bytecode; bytecode load 25.8 ms and source eval 72.6 ms against 1.9 and 11.4 ms without it | app-level | — | Guidance, not code. | — |
| Prerendered first screen | section 3 | | | | |
| Build-time-only subtrees | section 4 | | | | |

### 2.2 Bytecode as an asset, detail

The asset is produced by running the same engine on the build machine. In this spike
that is the test harness in `compile` mode; a real `fuse build` would need a small
host binary of fjs. Sizes: 57.3 KB for the 78.1 KB small bundle, 108.4 KB for the
140.5 KB bench bundle. Bytecode is larger than minified source and compresses worse
(gzip: 30.4 KB bytecode against 15.0 KB minified source for the small app).

### 2.3 What Vite and Rolldown settings do

The bundle is already a single scope-hoisted IIFE (module concatenation is what
Rolldown does by default), dev-only code is already absent from the production
bundle (I searched the small bundle; the composition is `@solidjs/signals` 53 KB,
`solid-fuse` 12.4 KB, `@solidjs/universal` 8.2 KB, app code the remainder), and
constants are already inlined by `define`. Minification and the target change bytes
but not time, because parse time is paid only when compiling and bytecode size is
dominated by the function bodies, not by identifier length.

Lazy routes and code splitting were not measured. The engine loads one script;
splitting needs a module loader for chunks on the Dart side, which does not exist.
Given that module evaluation is under 0.6 ms and bytecode loading was 1.9 ms at
57 KB and 25.8 ms at 735 KB, splitting would pay only for bundles several times
larger than the ones here. That last sentence is an extrapolation from two sizes.

### 2.4 Polyfill cost and laziness

Measured in the harness with the n200 bundle, `init` per built-in set: all 1.88 ms,
web 1.10, essential 0.63, min 0.46, none 0.38. The whole range is 1.5 ms. Making
polyfills lazy is not worth new machinery; an explicit list in the config would
capture it.

### 2.5 Heap snapshots and serialising an initialised context (read from source)

Source: the vendored quickjs-ng under rquickjs-sys (`quickjs.c`, `quickjs.h`,
`BC_VERSION` 24).

- There is no snapshot facility. Nothing in `quickjs.h` saves or restores a heap or
  a context.
- The only serialiser is `JS_WriteObject2` (`JS_WriteObjectRec` and helpers). Flags
  in `quickjs.h`: `JS_WRITE_OBJ_BYTECODE`, `JS_WRITE_OBJ_SAB`,
  `JS_WRITE_OBJ_REFERENCE`, `JS_WRITE_OBJ_STRIP_SOURCE`, `JS_WRITE_OBJ_STRIP_DEBUG`
  (`JS_WRITE_OBJ_BSWAP` is defined as 0 and obsolete). Read side:
  `JS_READ_OBJ_BYTECODE`, `JS_READ_OBJ_SAB`, `JS_READ_OBJ_REFERENCE`;
  `JS_READ_OBJ_ROM_DATA` is defined as 0 with the comment that it is obsolete and
  broken by inline caches, so bytecode cannot be used in place from a mapped file.
- What it can write: primitives, strings, BigInt, symbols, function bytecode
  (`JS_WriteFunctionTag`), modules (`JS_WriteModule`), plain objects
  (`JS_WriteObjectTag`: enumerable value properties only, no prototype; an accessor
  throws "only value properties are supported"), arrays, ArrayBuffer and typed
  arrays, RegExp, Date, boxed primitives, Map and Set. Everything else ends in
  `JS_ThrowTypeError("unsupported object class")`. That includes closures (a
  function with captured variables), native functions, promises and proxies.
- Consequence: an initialised Solid runtime is a graph of closures and cannot be
  serialised. A snapshot of "engine after module evaluation" is not available, and
  since module evaluation costs under 0.6 ms there would be nothing to gain.
- Limits of bytecode itself: `JS_ReadObjectAtoms` rejects a different version byte
  and checks a checksum, and predefined atoms are stored by index, so bytecode is
  tied to the engine build. The stream is little-endian with variable-length
  integers and I saw no pointer-sized fields, but loading x64-produced bytecode on
  ARM was not tested.
- Related risk in the existing cache (read from `bytecode_cache.dart`, not tested):
  the cache key is the bundle hash only. An app update that changes the engine but
  not the bundle would load stale bytecode; `start()` logs the failure and does not
  recompile.

### 2.6 Order of `runApp` and engine start

Without a prerender, awaiting the engine before `runApp` is the faster order
(section 2.1). With a prerender the order matters in the other direction, see 3.2.

### 2.7 Cold file cache (weak measurement)

One block of 12 launches of n200 with the app's own files evicted from the page
cache before each launch (`posix_fadvise`, system libraries stay cached; the block
was not interleaved and the load average was 2.4): `proc→main` 245 against 219 ms,
`initFjs` 7.9 against 3.5 ms, engine init 8.9 against 3.8 ms, `main→content` 93.8
against 67.0 ms. A truly cold system (after boot) was not measured.

## 3. Prerendered first screen (prototype, measured)

### 3.1 What was built

- `fuse build --prerender` runs the production bundle at build time in a child Bun
  process with the real renderer (`cli/prerender.ts`, `cli/prerender-worker.ts`),
  captures the first op batch and writes `assets/js/prerender.json`. Running the
  same bundle in QuickJS (harness, `prerender` mode) gave a byte-identical batch for
  n200.
- Dart: `FuseRuntime.deferred()` and `applyPrerendered(json, takeover:)` apply the
  batch before the engine exists, so `runApp` can show the screen at once. Node ids
  are allocated in creation order, so the ids in the prerendered batch are the ids
  JS will use.
- Take-over when the first real batch arrives, three modes (`FuseTakeover`):
  - `remount`: drop the prerendered nodes and apply the real batch.
  - `hydrate` (default): if the real batch is string-identical, adopt the tree with
    no work. Otherwise replay the batch's structure against the existing nodes; if
    types and structure match, patch only props and texts that differ. Otherwise
    fall back to remount.
  - `trust`: Dart tells JS the op and node counts; JS does not send its first batch
    when its own counts match. Values are not compared.
- Taps that arrive before JS is ready are queued and replayed after take-over
  (`replayEarlyEvents`), except after a remount.
- Option (c), a snapshot from the previous run: `saved batch` stores the last first
  batch on device; `saved tree` serialises the current tree with `snapshotOps()`.

### 3.2 Results

`main()`-relative medians in ms (min–max), n = 12, bytecode asset in every column.
"interactive" is the time at which a tap sent at first content has changed the
screen.

| | no prerender | hydrate | hydrate, engine started first (`overlap`) | trust | saved batch |
|---|---:|---:|---:|---:|---:|
| small: first content | 38.7 (31–53) | 19.2 (16–27) | 35.1 (29–52) | 17.9 (15–25) | 19.7 (15–25) |
| small: interactive | 44.7 (35–57) | 41.1 (36–51) | 39.9 (34–57) | 42.0 (36–57) | 42.9 (35–62) |
| n200: first content | 67.0 (55–86) | 35.9 (30–51) | 56.6 (45–74) | 42.2 (30–52) | 43.5 (32–55) |
| n200: interactive | 72.2 (64–92) | 74.9 (59–88) | 62.8 (50–78) | 77.7 (69–87) | 86.5 (66–118) |
| n1000: first content | 126 (90–185) | 78.2 (61–120) | 87.4 (75–114) | 69.0 (56–103) | 59.2 (51–91) |
| n1000: interactive | 139 (97–197) | 142 (104–207) | 96.2 (88–124) | 138 (107–173) | 121 (103–155) |

Reading:

- Showing the prerendered screen first roughly halves time to first content
  (small −20 ms, n200 −31 ms, n1000 −48 ms). It does not make the app interactive
  sooner: the engine boot is queued behind the first frame on the same isolate, so
  interactive time is unchanged.
- Starting the engine first and calling `runApp` when evaluation begins (`overlap`)
  lets the first frame and the JS mount run in parallel on two threads. For n1000
  this is the best overall result: content at 87 ms and interactive at 96 ms,
  against 126 and 139 ms. For the small app it is no better than no prerender for
  first content.
- Against today's default (cached bytecode, section 1.1) the combination of
  bytecode asset, prerender and `overlap` moves n1000 from 138 / 148 ms (content /
  interactive) to 87 / 96 ms, and from 188 / 202 ms on a first launch.
- From process start these gains are 20–50 ms on top of about 210 ms that belongs to
  Flutter; `proc→content` for n1000 goes from 343 (268–403) to 303–310 ms.
- `trust` saves the decode and compare of the first batch (2 ms at 1,000 nodes). It
  is not distinguishable from `hydrate` end to end and is the only mode that can
  leave wrong content on screen.
- Take-over cost, frame after take-over (n1000): identical 4.7–7.7 ms, patched text
  5.3 ms, remount with equal ids 8.0 ms (elements are keyed by node id and are
  reused), remount after a structural mismatch 54 ms (39–72), remount from a saved
  tree with renumbered ids 38 ms.

The `saved tree` column of the raw tables shows "tap applied" at first-content time.
That is an artefact: the saved tree already contains the tapped state. Only its
first-content and take-over figures are meaningful.

### 3.3 What breaks, and what was observed

| case | behaviour in the prototype | observed |
|---|---|---|
| Text or prop differs (data, locale strings) | `hydrate` patches the differing props after JS has mounted; the user sees the old value until then | measured (`text differs`): result `patched`, one visible correction, early tap survives |
| Structure differs (other route, auth state, list length) | falls back to remount: one extra full frame and a visible replacement | measured (`structure differs`): n1000 54 ms frame; the early tap was lost (`Taps: 0`) |
| Device size | The batch has no layout in it, so size as such is safe. Anything the app computes from `__fuseHost` or media queries at mount is fixed at build time and falls under the two rows above | read from code; not measured |
| Theme, dark mode, locale, text scale | same: the build picks one host description (`--prerender=<platform>`); a different device value is a prop or structure difference | not measured |
| Auth and other async state | `fetch` never settles at build time, so the prerender contains loading states; a signed-in user sees the signed-out shell first | by construction; not measured with a real app |
| Handlers before JS is ready | Calls are queued and replayed after an identical, patched or trusted take-over, in order. A handler that depended on state that differs runs against the real state. After a remount they are dropped (also in plain `remount` mode: `Taps: 0`). Text input, scroll position and focus changes made before take-over are not captured as events | tap replay measured; the rest read from code |
| Node id allocation | Ids match only if JS creates nodes in the same order as at build time. `hydrate` checks types and structure; `trust` checks counts only and can adopt a wrong tree with equal counts | covered by unit tests; no wrong adoption provoked in the app |
| First render in more than one batch | Take-over looks at the first batch only | not handled, not measured |
| Navigation state, deep links | The prerender is the initial route. A launch that restores another route is a structure mismatch | not measured |
| Templates and baked clones in the first batch | `hydrate` handles the template op; a batch containing clone or dispose falls back to remount; the prerender worker's node count excludes clone-reserved ids, so `trust` falls back to sending | read from code and unit tests |

The saved-batch option avoids most data, theme and locale mismatches because the
snapshot comes from the same device and user, at the cost of a file write per
launch (0.2–0.8 ms measured for the batch) and no benefit on the first launch.

## 4. Build-time-only subtrees ("server-component-like")

### 4.1 What was built

A module named `*.baked.tsx` is rendered at build time by a Vite plugin
(`cli/baked-plugin.ts`): a nested build, a prerender, and a conversion of the ops
into a shape (`cli/ops-to-shape.ts`) written to `assets/js/baked.json`. In the app
bundle the module is replaced by a stub that emits one clone op with a string key
(`_baked(key, type, size)` in `renderer.ts`). Dart resolves the key from the asset
(`registerBaked`). No component code for the subtree exists at run time.

Props: not implemented. A baked module takes no props and has no handlers. Props
known at build time could be passed as plugin options. Props known only at run time
would need holes in the shape, which is what compile-time templates already do.

### 4.2 Measured, on the 992-node static page

| | live JSX | baked |
|---|---:|---:|
| bundle.js | 195.0 KB | 74.2 KB |
| bundle bytecode | 119.3 KB | 54.0 KB |
| baked.json | — | 71.6 KB |
| first mount in JS (harness) | 10.3 ms (6.1–16.6) | 0.20 ms (0.15–0.30) |
| evaluate until Dart has the result (app) | 20.2 ms (13–23) | 5.3 ms (3.8–8.3) |
| read + decode baked.json (Dart, before `runApp`) | — | 5.2 ms (4.4–11.7) |
| decode + apply ops | 2.2 ms | 0.8 ms |
| `main()` → first content | 109 (80–129) | 89.5 (72–109) |
| `main()` → interactive | 121 (98–144) | 103 (80–121) |

So baking removes about 10 ms of JS and 121 KB of JS source for this page. Shipped
bytes do not shrink when bytecode is the format: 54.0 + 71.6 KB against 119.3 KB.
About 5 ms returns as JSON decoding on the Dart side; a binary shape format or lazy
decoding was not tried. The page is the favourable case, since its code is large
literal JSX. For a screen generated by a loop, such as n1000, baking would save the
21.9 ms mount but would add bytes (a 74 KB batch replacing a few hundred bytes of
code). That last sentence is an estimate from the two measured cases.

### 4.3 Overlap with compile-time templates

Nothing was coordinated with the templates work, as instructed. The overlap is
real: both use the same template and clone ops and the same Dart shape registry;
baking is a template whose shape is produced by running arbitrary code at build
time and stored in an asset, with no holes. If templates land with holes for
dynamic props, baking should become a thin layer on them (a template whose hole
list is empty and whose shape lives outside the bundle) and not a second mechanism.

## 5. What Vite can do and what needs our own build step

Vite and Rolldown, by configuration only: minify, target, tree shaking, defines,
dropping the source map from the shipped assets, and manual chunks if a chunk
loader existed.

Needs our own step after Vite: compiling the bundle to bytecode with the shipping
engine build; prerendering (running the bundle and capturing ops); baking (a Vite
plugin, but one that runs a nested build and executes its output). All three need
the bundle to be executed, and bytecode needs the real engine. Bun produced the
same ops as QuickJS for the one screen compared; that is one data point, not a
guarantee.

## 6. Tests

Added, all passing when run per file: `dart/test/prerender_test.dart` (13),
`dart/test/prerender_widget_test.dart` (4), `src/renderer-trust.test.ts` (3),
`cli/prerender.test.ts` (5), `cli/ops-to-shape.test.ts` (3). Existing
`src/renderer.test.ts` (16), `dart/test/apply_ops_test.dart` (15) and
`dart/test/node_widget_test.dart` (5) pass. `flutter analyze` reports errors only
in `test/widget_test.dart` (a stale template test, not touched here) and none in
the files changed here.

## 7. Not measured, not done

- No phone or ARM device. I looked for published per-phase numbers for Flutter
  start-up or for bytecode loading on ARM and found only descriptions without
  numbers (Flutter's add-to-app performance page describes the load sequence;
  the Hermes announcement describes build-time bytecode and memory mapping). I
  therefore make no prediction of how the breakdown shifts on ARM.
- `proc→main` was not split into engine, GTK and VM parts.
- Cross-architecture bytecode loading; bytecode version stamping; a unit test for
  the fallback to source.
- The combined boot call; lazy polyfills; code splitting and lazy routes.
- `evaluate_script_bytecode_unchecked` is reachable from the harness only.
- Baked subtrees with props or handlers.
- Take-over when the first render arrives in several batches.
- A cold system page cache; GPU rasterisation; other JS engines.
- The cost of `path_provider` on Android and iOS, which decides whether the
  on-device cache is worth keeping next to a bytecode asset.

## 8. Rerun

```bash
export PATH=/opt/flutter/bin:$PATH
cd examples/perf_bench
export HARNESS=<libfjs test binary>        # cargo test --release --no-run in libfjs
tools/cold-build.sh small n200 n1000 static static-live   # variants into build-cold/
NICE=-10 tools/cold-all.sh a 3 4           # 14 configs x 3 variants, about 15 minutes
tools/cold-tables.sh a > results/r13/tables-a.md
tools/cold-harness.sh 20 results/r13/harness-b
tools/cold-vite.sh 20 results/r13/vite-b.txt
python3 tools/cold-vite-agg.py [--phases|--marks] <file>
```

Do not edit the scripts or rebuild the Flutter bundle while a run is active.
