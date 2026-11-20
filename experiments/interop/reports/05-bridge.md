# 05 — What the bridge can be made to do: nested refs and synchronous calls

Branch `spike/bridge` (worktree `/home/claude/wt/bridge`), three local commits on top of `95e4e33`. Everything below was built and run; where something was not verified it says so.

## Verdict

**Problem A (nested node refs and functions): solved.** Functions, JSX nodes and handles are now encoded as tagged refs at any depth of a prop value and decoded once on the Dart side. `node.map('decoration')?.widget('prefixIcon')`, a list of widgets, and a callback inside a data object all work, with tests on both sides. The `true` callback marker is gone from the wire. Existing widgets are unchanged. Cost is small for ordinary props and is bounded for large data props by an opt-out.

**Problem B (synchronous Dart-to-JS calls): feasible, cheap, and I recommend adopting it, with one rule.** fjs can expose a synchronous call with about 150 lines of additive Rust. A call costs 5–9 µs in Rust and 22–45 µs end to end from Dart (debug build). The rule: from inside a Flutter build, only ever use the deadline-bounded variant, which gives up after a wait budget (2 ms) and lets the caller show a placeholder. The unbounded variant blocks the UI thread for as long as JS is busy (measured: 150–180 ms behind a 200 ms JS task) and is only acceptable for event-time callbacks that must return an answer, such as validators.

**For list builders specifically, default to windowed virtualization (asynchronous), not the synchronous builder.** The synchronous builder works and never shows a hole while JS is idle, but it moves the cost of rendering each item onto the UI thread: 600–1,000 µs per item in this setup, 11–20 ms for a first frame of 14 items. Windowed virtualization keeps that cost off the UI thread and showed no placeholders in steady scrolling.

## Measurement conditions

All numbers come from one shared 4-core Linux machine with other jobs running (load average 3 to 10 during runs). They are upper bounds and are noisy; ranges are across 3 to 5 runs.

- **Rust numbers**: `cargo test`, fjs crate at dev profile, dependencies (QuickJS) at `opt-level = "z"`, which is also what release uses.
- **Dart numbers**: `flutter test -d linux` integration test under xvfb, **debug build** (JIT, assertions on).
- **Not measured**: profile or release builds, iOS, Android, web, the dev-server connection. The absolute numbers should be re-taken in profile mode on a phone before any of this ships.

## Problem A: recursive prop encoding

### Wire encoding (recommended, implemented)

A prop value is JSON-shaped data. Three kinds of leaf are replaced by a single-key tagged object, at any depth, in `setProp` values and in `create` props:

| JS value | Wire | Dart value | Ownership |
|---|---|---|---|
| function | `{"$fn": "<path>"}` | `FuseCallback` | handler lives on the JS node |
| `FuseNode` (orphan JSX element) | `{"$node": <id>}` | `FuseNode` | **owned** by the prop |
| handle (`{ node: FuseNode }`) | `{"$handle": <id>}` | `FuseNode` | **borrowed** |
| legacy, still accepted by Dart | `true` / `{"_node": <id>}` | callback / owned `FuseNode` | as before |

`<path>` is the function's location inside the node's props, joined with `/`: `onTap`, `lineTouchData/touchCallback`, `items/2/onTap`. A `/` or `~` inside a key is escaped JSON-pointer style (`~1`, `~0`). Dart invokes a callback exactly as before, `_functionCall {nodeId, name: <path>, value}`, so the top-level case is byte-identical to today's call.

Examples:

```json
{"op":"setProp","id":7,"name":"onTap","value":{"$fn":"onTap"}}
{"op":"setProp","id":7,"name":"enabled","value":true}
{"op":"setProp","id":7,"name":"actions","value":[{"$node":12},{"$node":13}]}
{"op":"setProp","id":7,"name":"decoration","value":{
  "hintText":"Search",
  "prefixIcon":{"$node":12},
  "onClear":{"$fn":"decoration/onClear"}}}
{"op":"setProp","id":7,"name":"items","value":[
  {"icon":{"$node":12},"label":"Home","onTap":{"$fn":"items/0/onTap"}}]}
{"op":"setProp","id":7,"name":"controller","value":{"$handle":4}}
{"op":"create","id":4,"type":"scrollController","props":{
  "initialScrollOffset":5,"setScrollOffset":{"$fn":"setScrollOffset"}}}
```

Why a path and not a numeric id for functions: the path is stable when a closure is replaced by a fresh one (every re-render of an inline arrow function), so nothing needs allocating or releasing per render, and cleanup is by node, not by function.

### Lifecycle

- **Handlers.** They used to live in one global map keyed `"${nodeId}:${name}"` that was only cleared on full unmount. They now live on the node (`node.handlers`) and are released when the node is removed, when a prop stops containing them, when a handle is disposed, and on unmount.
- **Slot nodes** (`$node`). Created by JSX before the op that references them, as today. Each prop owns the slot nodes its current value references. When the prop changes, slots it no longer references are disposed (with their subtree); slots it still references are kept. When the owner is removed, its slots go with it, recursively. Both sides do this independently from the same information, as before.
- **Handles** (`$handle`). **Behaviour change.** Today a handle passed as a prop is sent as `{_node}` and Dart disposes it when the widget using it is removed or the prop switches to another handle, while JS still thinks it is alive. It is now borrowed: only its creator's `dispose` (or owner cleanup) disposes it. Covered by a test.
- `createHandle` now inlines all props, functions included, into the `create` op, and Dart decodes `create` props, so a handle factory sees its callbacks at construction.

### Dart API

`FuseMap` (and therefore `FuseNode` and every nested map) gained `callback`, `asyncCallback`, `syncCallback`, `trySyncCallback`, `widget`, `widgetList`, `handle<T>`, `mapList`. Decoding happens once in `applyOps`, not on every build. Existing accessors and widget builders are untouched; `node.callback(name)` still accepts the legacy `true`.

### Cost of walking every prop

The walk is copy-on-write (a value with no refs is returned by identity, nothing allocated) and has a fast exit for primitives.

Inside QuickJS (best of 7 batches, ns per call). "Send" is the whole JS-side cost of `setProp` plus flushing the op, for scale:

| Value | Walk | Whole send |
|---|---:|---:|
| number / string | 0.26–0.34 µs | 17–23 µs |
| function, top level | 2.1–2.9 µs | |
| padding `{4 numbers}` | 3.5–4.5 µs | 26–37 µs |
| decoration, 5 nested classes, 16 leaves | 15–17 µs | 54–94 µs |
| InputDecoration with 2 widgets and 1 callback | 11–14 µs | |
| 5 nav items, each `{icon, label, onTap}` | 37–48 µs | |
| 1,000 chart points `{x, y}` | 2.1–2.8 ms | 5.8–6.9 ms |
| 10,000 chart points `{x, y}` | 22–30 ms | 55–89 ms |
| 10,000 chart points, `markRaw` | 0 | 32–35 ms |

- For primitives, which are most props, the walk is about 1% of a send.
- For small objects it is roughly 15–30% of a send.
- For large data arrays it is roughly 30–50%. QuickJS in this build is slow in general: `JSON.stringify` of the same 10,000 points, native code, took 9–15 ms.
- The same walk under Bun's JIT: 28 ns for a number, 370 ns for the decoration, 0.2 ms for 10,000 points.

Dart side (`flutter test`, JIT, per `setProp` op including the op's own overhead): number 0.23 µs, decoration 0.76 µs, InputDecoration with refs 2.1 µs, 10,000 points 0.85 ms.

**Bound.** `markRaw(value)` (`src/wire.ts`) marks an object as plain data and skips the walk. A generator can apply it mechanically: the manifest knows which parameters can contain a widget or a callback, so every other object-valued prop is data. That is the recommended way to bound the cost; I implemented the opt-out but not the manifest-driven use of it.

### Limits

- A user data object that happens to be exactly `{"$fn": …}`, `{"$node": …}` or `{"$handle": …}` is misread as a ref. Not escaped.
- Only plain objects and arrays are walked; class instances pass through as before. Depth is capped at 32 and a cyclic value throws.
- A slot prop given a reactive accessor (for example a `<Show>` result, which is a function) is still registered as a callback, not a node. This hazard from the audit is unchanged.
- Tests drive the renderer API directly (`createElement`, `setProp`, `insert`), which is what JSX compiles to. I did not compile JSX through the Vite plugin against the new renderer.
- While reading `@solidjs/universal` I noticed `reconcileArrays` moves an existing node with a bare `insertNode` (no `removeNode`), and the renderer's `insertNode` would then leave a duplicate in `parent.children`. I did not reproduce it and did not change it.

## Problem B: synchronous Dart-to-JS calls

### How the engine is arranged today

- JS does not live on one thread. fjs runs every JS entry on a 4-thread tokio pool with 8 MB stacks (`libfjs/src/js_executor.rs`). The QuickJS runtime sits behind an async mutex (`async_lock::Mutex`, inside rquickjs's `AsyncRuntime`), and whichever thread holds it runs JS.
- The lock is taken per poll, not per call. A JS-to-Dart `bridge_call` is a future; while it is pending the lock is released. So nothing that holds the lock ever waits on the Dart thread.
- The background driver is one more task on that pool that takes the same lock to run promise jobs and spawned futures.

So a synchronous call does not need a new threading arrangement. The calling thread takes the lock and runs the function itself.

### What I added to fjs

Two `#[frb(sync)]` methods on `JsEngine` (`libfjs/src/api/engine.rs`):

- `call_global_sync(function, params) -> JsValue`: blocks on the runtime lock, then calls `globalThis[function](...params)` on the caller's thread.
- `try_call_global_sync(function, params, max_wait_micros) -> Option<JsValue>`: same, but waits for the lock at most `max_wait_micros` (0 never waits) and returns `None` if a worker is still running JS.

Properties, each covered by a Rust test in `libfjs/src/tests/sync_call_tests.rs`:

| Question | Answer |
|---|---|
| What runs inside the call? | Only the function body. Promise jobs and spawned futures it queues are not run. |
| What about the background driver? | The call does not drain jobs and does not touch the driver's waker. It spawns a no-op to wake the driver, which runs the queued work on a worker afterwards. This respects the "never drain manually" rule. |
| Re-entrancy, when the JS sends ops back? | `fjs.bridge_call` from inside the function returns a promise immediately; the Dart handler runs later on the Dart event loop, after the caller has resumed. There is no nested Dart→JS→Dart→JS. Verified: the function returns before its microtask and its bridge call are delivered, and both arrive shortly after. |
| Can it deadlock? | No holder of the lock waits on the Dart thread, so it can only wait, not deadlock. Four threads of sync calls interleaved with async calls gave correct results. |
| A returned Promise? | An error. It could only be awaited by blocking the event loop it depends on. |
| The caller's stack? | The UI thread is not one of fjs's 8 MB threads. The JS stack budget is lowered to 256 KB for the call and restored after: runaway recursion throws a JS error instead of overflowing. Measured recursion depth: 9,828 frames on a worker, 410 in a sync call, 9,828 on a worker afterwards. |
| JS throws, or the global is missing? | A Dart exception with the JS message. |

### Latency

| Path | Per call |
|---|---:|
| Rust: `call_global_sync`, int → string | 4.3–8.7 µs |
| Rust: `call_global_sync`, int → 4-field object | 17–31 µs |
| Rust: async `eval` of the same function, awaited | 57–79 µs |
| Dart: `engine.callGlobalSync`, int → string (best of 10 batches) | 22–35 µs |
| Dart: `engine.callGlobalSync`, int → 4-field object | 28–45 µs |
| Dart: `node.map("axis").syncCallback("getTitle")`, full renderer path | 43–68 µs |
| Dart: 1,000 async calls issued together | 110–290 µs each |

A list building 20 items per frame needs the call itself to be well under a millisecond; it is, by a factor of 20 or more. The call is not the expensive part of a builder (see below).

**I could not measure the awaited async round trip from Dart.** One awaited `channels.call` took 7–14 ms in this harness, but so did `await Future.delayed(Duration.zero)` (4–8 ms) and an awaited fjs call that never touches JS (6–11 ms). That is the test harness's event-loop turnaround, not the bridge.

### The real cost: lock contention

| Situation | UI thread blocked for |
|---|---:|
| `callGlobalSync` issued ~25 ms into a 200 ms JS task | 145–181 ms |
| `callGlobalSync` issued ~25 ms into a 50 ms JS task | 0–31 ms |
| `tryCallGlobalSync`, budget 0, during a 200 ms JS task | 0.03 ms in Rust, 0.7–1.5 ms from Dart |
| `tryCallGlobalSync`, budget 2 ms, during a 200 ms JS task | 2.2–2.3 ms |

The unbounded call stalls the frame for the rest of whatever JS is doing: an initial render, a large state update, JSON parsing. The bounded call turns that into one placeholder frame. `FuseRuntime.tryCallFunctionSync` applies the budget once per frame: after the first "busy" answer, later callers in the same frame are told "busy" immediately. Without that, a list jump while JS was busy cost 59–68 ms (18 items each waiting out the budget); with it, 31 ms in the one run I have, and I did not look into what the remainder is.

A budget of 0 is too strict. With it, in one of two runs, one item in 333 fell back to a placeholder during ordinary scrolling; the likely cause is JS briefly holding the lock to handle a `disposeItem` message, which I did not confirm. With 2 ms, none did in three runs.

### Returning widgets from a synchronous call

A builder must return a widget, and the nodes it creates only exist in JS's op journal. So the JS entry point, `__fuseCallSync(nodeId, path, value)` in `src/renderer.ts`, flushes Solid, drains the journal, and returns both:

```json
[{"$node": 41}, "[{\"op\":\"create\",\"id\":41,\"type\":\"fuseItem\",\"props\":{}}, …]"]
```

The second element is the drained ops as one JSON string, or `null`. Dart applies them before decoding the value, so the returned `{$node}` is a live `FuseNode` inside the same build. Listener notification is deferred to the end of the frame, because notifying during build is illegal; freshly created nodes have no listeners, so nothing is lost. A plain value-returning callback returns `[value, null]`.

### Risks, and what would have to go upstream

To upstream to fjs (all additive, no existing signature changes):

1. `JsEngine::call_global_sync` and `JsEngine::try_call_global_sync` with `#[frb(sync)]`.
2. `sync_call_in_ctx`, `SYNC_CALL_STACK_SIZE`, and `block_on_until` (in `js_executor.rs`).
3. A private `stack_limit: Arc<AtomicUsize>` on `JsAsyncRuntime`, so the stack budget can be restored (QuickJS has no getter). It is set in `set_max_stack_size`.
4. Regenerated frb bindings (codegen 2.12.0).
5. `tests/sync_call_tests.rs`.

Risks:

- **Stack size on real devices is not verified.** 256 KB is a guess that is safe for a 1 MB thread that is already deep in a Flutter build. It allows about 410 JS frames here. A deeply nested item component could hit that and throw; the budget should become configurable.
- **Raw QuickJS calls.** The stack budget is changed with `JS_SetMaxStackSize` through `rquickjs::qjs`, under the lock. It depends on rquickjs keeping `qjs` public.
- **Web.** The generated web bindings compile in principle (they were regenerated) but I did not build or run fjs for web, and blocking is a different question there.
- **A sync call from a non-UI isolate, or two engines.** Not tested.
- **frb codegen gotcha.** The codegen parses `cargo expand` output. `std::pin::pin!` expands to `super let`, which it cannot parse ("unexpected token, expected `;`"). I used `Box::pin`. Also, the stale `frb_generated.rs` must compile before regenerating after a signature change.
- 3 fjs tests fail on this machine before and after my change (`*_bytecode*` in `engine_tests.rs`); unrelated.

## Asynchronous alternatives, and the list builder

### What I prototyped

Both are in `src/experimental/list-builder.ts` and `dart/lib/src/experimental/list_builder.dart`, exercised by `examples/polyfill_tests/integration_test/bridge_spike_test.dart` against the real engine, the real renderer and a real `ListView.builder` with 10,000 items of 3 widgets each (7 nodes, about 13 ops).

**Synchronous builder (`SyncListView`).** `itemBuilder(context, i)` calls JS with the 2 ms budget. JS renders the item under its own reactive root into a holder node and returns it. Dart tells JS when Flutter unmounts an item and JS disposes that root.

| Measure | Result |
|---|---|
| Frames with a missing item while JS was idle | 0 of 60, scrolling 400 px per frame |
| Items rendered for a 10,000-item list | 14 on the first frame, not 10,000 |
| Per item, on the UI thread | 600–1,000 µs while scrolling, 770–1,400 µs on the first frame |
| …of which inside JS (render, Solid flush, journal drain) | 270–380 µs |
| First frame, 14 items | 11–20 ms inside builders |
| Worst scrolling frame | 5–6 ms on quieter runs, up to 23 ms under load |
| Item subtrees alive after scrolling past 365 items | 18 |
| Reactivity inside built items | works, through the ordinary async op path |
| Jump while JS is busy for 150 ms | placeholders that frame, real items after JS frees up |

**Windowed virtualization (`VirtualListView`), strategy (b).** Dart reports the index range it has mounted. JS keeps a keyed pool for that range plus an overscan (15 here) as ordinary children. Dart's `itemBuilder` returns the materialised child, or a placeholder of the item extent.

| Measure | Result |
|---|---|
| Items rendered in JS after mount | 35 |
| Placeholder builds, 60 frames at 40 px per frame | 0 |
| Placeholder builds, 60 frames at 400 px per frame | 0 |
| Jump far outside the pool | 18 placeholders, real items after 79–208 ms (2–3 frames here) |
| JS work on the UI thread | none |

The scrolling frames in this test were spaced at least 4 ms apart, not at a true 60 or 120 Hz, so "0 placeholders at 400 px per frame" means JS kept up when given that long, not that it would on a device.

### Comparison of the strategies

| | UI thread cost | Holes | Needs | Fits |
|---|---|---|---|---|
| (a) Push args, render a frame later (slivers branch) | none | always one frame late; needs de-dup to avoid feedback loops | nothing new | builders with one live set of args: `headerSliverBuilder`, `LayoutBuilder`-style |
| (b) Windowed virtualization | none | only on jumps beyond the overscan | item extent or an estimate for placeholders | indexed builders over a large or unbounded range |
| (c) Declarative template evaluated in Dart | none | none | a small expression vocabulary, designed by hand | simple value-to-label formatting |
| (d) Precomputed table / JS pushes the result as a prop | none | none | a finite, known domain | chart tick labels, validators as `errorText` |
| Sync call, unbounded | the call, plus any JS task in progress | none | fjs change | event-time callbacks that must answer |
| Sync call, deadline-bounded | the call, at most the budget when JS is busy | one frame when JS is busy | fjs change | per-frame value callbacks, small builders |

I did not prototype (a), (c) or (d). (a) exists on the slivers branch; (c) and (d) are design-level here.

An obvious next experiment I did not run: (b) with a deadline-bounded synchronous fill for indices the pool misses, so a jump shows real items instead of placeholders whenever JS is idle.

## Recommended pattern per category

Categories follow the survey in report 02. "Mechanical" means a generator can choose and apply the pattern from the type signature alone.

| Category | Examples | Pattern | Mechanical? |
|---|---|---|---|
| `void` callbacks, any nesting | `onTap`, `LineTouchData.touchCallback` | `{$fn}` + `callback()` | Yes. Done. |
| Widgets nested in data classes and lists | `actions`, `InputDecoration.prefixIcon`, `BottomNavigationBarItem.icon`, `DataColumn.label` | `{$node}` + `widget()` / `widgetList()` | Yes. Done. This unblocks the "needs nested widget/callback" row of report 02. |
| Callbacks returning a `Future` | `onRefresh`, `confirmDismiss` | `asyncCallback()` (`_functionCallAsync`) | Yes: return type is `Future<T>`. |
| Builder, context only | `Builder`, dialog and route builders | Static slot: render once in JS, pass as `{$node}` | Yes: the only argument is `BuildContext`. |
| Builder, index over a range | `ListView.builder`, `GridView.builder`, `PageView.builder`, `SliverChildBuilderDelegate` | (b) windowed virtualization | Yes when the signature is `Widget? Function(BuildContext, int)` with a sibling count. Needs an annotation for the placeholder extent when there is no `itemExtent`. |
| Builder, encodable args, one live set of args | `LayoutBuilder`, `headerSliverBuilder`, `ValueListenableBuilder`, `SliverLayoutBuilder` | Deadline-bounded sync call, cached on the encoded args; fall back to (a) | Mostly: args encodable is visible in the signature. Whether a one-frame lag is acceptable is not, so the fallback choice needs a default plus an annotation. |
| Builder, unencodable args | `AnimatedBuilder(animation, child)`, `FormField.builder(state)`, `TransitionBuilder` | Per API. `(context, child)` can be a wrapper slot; `Animation` and state objects need a hand-written adapter | No. |
| Validators | `TextFormField.validator`, `FormField.validator` | Unbounded sync call (runs on user events, must answer); or (d) JS validates and pushes `errorText` | Yes for the sync call: `String? Function(T?)` with encodable `T`. (d) changes the API shape, so it is a per-API decision. |
| Predicates | `selectableDayPredicate`, `onWillAccept`, `canPop`-style | Sync call. Bounded with a declared default when called during build; unbounded when event-time | Partly: the signature says `bool`, not when it is called. Needs a per-API "build-time or event-time" flag and a fallback value. |
| Notification handlers returning `bool` | `NotificationListener.onNotification` | Return a constant from Dart, fire the callback asynchronously | Needs a per-API constant. |
| Formatters, value to string or widget | fl_chart `getTitlesWidget`, `Slider.semanticFormatterCallback`, `itemExtentBuilder` | Deadline-bounded sync call, cached per argument until the prop is re-set; (d) a table where the domain is known; (c) only if a template vocabulary is designed | Yes for the sync call. (c) and (d) are per API. |
| Delegates that are abstract classes of getters and methods | `SliverPersistentHeaderDelegate` | A generated subclass whose getters read data fields and whose methods sync-call functions in an object prop | Plausibly mechanical ("abstract class → object of fields and functions"), but not prototyped. |
| Delegates that are imperative protocols | `CustomPainter`, `FlowDelegate`, `MultiChildLayoutDelegate` | Not callbacks: a declarative command list for painting, hand-designed; layout delegates stay hand-written | No. |
| Framework objects | `RouterDelegate`, `LocalizationsDelegate`, `Map<ShortcutActivator, Intent>` | Out of scope for the bridge | No. |

## What changed, by file

Paths are relative to `/home/claude/wt/bridge`.

**JS (`packages/solid-fuse/src/`)**

- `node.ts` (new): `FuseNode`, moved out of the renderer, plus per-node `handlers` and per-prop `refs`.
- `wire.ts` (new): `encodeProp`, `takeRefs`, `markRaw`. The recursive walk.
- `renderer.ts`: `setProperty` uses the encoder; `encodeNodeProp`, `releaseSubtree`; handlers per node; `_functionCallAsync` channel; `__fuseCallSync` global.
- `handle.ts`: props inlined into `create` through the encoder; `dispose` releases handlers.
- `experimental/list-builder.ts` (new): `SyncListView`, `VirtualListView`. Not exported from the package index.
- `wire.test.ts` (new): 19 tests.
- `../test-bundles/bridge_spike.ts` (new): the bundle the integration test runs in QuickJS, including the encode benchmark.

**Dart (`packages/solid-fuse/dart/`)**

- `lib/src/node.dart`: `FuseCallback`, `fuseJsBusy`, the new `FuseMap` accessors, per-prop slot ownership on `FuseNode`, sync and async call hooks on `FuseNodeRegistry`.
- `lib/src/runtime.dart`: `_decode` / `_decodeProp`, decoding of `create` props, slot disposal by ownership, `callFunctionAsync`, `callFunctionSync`, `tryCallFunctionSync`, `applySyncResult`, `applyOps(duringBuild:)`, `FuseRuntime.forTesting`, `connectForTesting`.
- `lib/src/experimental/list_builder.dart` (new): `FuseSyncListView`, `FuseVirtualListView`, `FuseItemHolder`, `registerExperimentalListBuilders`.
- `test/wire_decode_test.dart` (new, 14 tests), `test/wire_decode_bench_test.dart` (new).

**fjs (`packages/solid-fuse/dart/lib/src/fjs/`)**, edited in the vendored copy; needs `make push-fjs` or a port to the fjs repo.

- `libfjs/src/api/engine.rs`: `call_global_sync`, `try_call_global_sync`, `sync_call_in_ctx`, `SYNC_CALL_STACK_SIZE`.
- `libfjs/src/api/runtime.rs`: `stack_limit` field.
- `libfjs/src/js_executor.rs`: `block_on_until`.
- `libfjs/src/tests/sync_call_tests.rs` (new): 8 tests plus an ignored latency probe.
- `libfjs/src/frb_generated.rs`, `lib/src/frb/**`: regenerated.

**Other**

- `examples/polyfill_tests/integration_test/bridge_spike_test.dart` (new, 7 tests), `assets/bridge_spike.js` (built bundle), `linux/` (from `flutter create --platforms=linux .`).
- `packages/docs/content/docs/extending/creating-widgets.mdx`: nested refs, new accessors, the `$fn` explanation. The handle ownership change and the experimental sync API are not documented in the user docs yet.
- Root `package.json`: `overrides` pinning the Solid packages, as instructed.

## How to run

```bash
# JS (the lifecycle test needs Solid's client build, hence the condition)
cd packages/solid-fuse
bun test --conditions browser ./src/wire.test.ts

# Dart decoding
cd packages/solid-fuse/dart
flutter test test/wire_decode_test.dart test/wire_decode_bench_test.dart

# fjs
cd packages/solid-fuse/dart/lib/src/fjs/libfjs
cargo test sync_call -- --nocapture
cargo test sync_call_latency -- --nocapture --ignored

# End to end, real engine (rebuild the bundle first if JS changed)
cd packages/solid-fuse
bun build test-bundles/bridge_spike.ts --conditions browser --format iife \
  --outfile ../../examples/polyfill_tests/assets/bridge_spike.js
cd ../../examples/polyfill_tests
xvfb-run -a flutter test integration_test/bridge_spike_test.dart -d linux

# After changing a pub fn in libfjs/src/api
cd packages/solid-fuse/dart/lib/src/fjs && flutter_rust_bridge_codegen generate   # 2.12.0
```

`bun test ./src/navigator.test.ts` hangs on this machine with and without these changes.

## Open questions for whoever picks this up

1. Profile-mode numbers on a phone for the per-item cost of the synchronous builder. That decides whether it is ever the default for lists.
2. Whether to ship the handle ownership change (borrowed, not disposed with the widget) on its own; it is a bug fix independent of the rest.
3. Whether user data may contain `$`-prefixed single-key objects, and if so an escape.
4. The manifest-driven use of `markRaw`, so data-only props skip the walk without the author doing anything.
5. The sync stack budget: 256 KB is unverified against real UI-thread stacks.
