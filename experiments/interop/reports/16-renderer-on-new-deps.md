# Report 16: the renderer on the updated dependencies

Branch `fix/renderer-on-new-deps` (landed on `main`, see git log). Commit hashes below are from before the rebase onto main. Reviewed before landing; three review fixes were added on top (non-finite numbers over JSON, handle options kept in the create op, a dropped batch is reported).

## Summary

Branch `fix/renderer-on-new-deps` in `/home/claude/wt/mainfix` has 11 commits on top of `origin/main` (4fc0652). Nothing is pushed.

**Fixed**
- **Keyed list moves** work end to end. The app-level suite passes 60 of 60 order checks per semantics state; main passes 3 of 15 and logs 24 `applyOps` errors.
- **The list-move JS regression** had two causes. Duplicate entries in the JS `children` mirror were real (2,000 rows grew to 6,183 entries after four reorders), but most of the cost was `indexOf` and `splice` on the child array: 203 of 221 ms for a sort. Child lists are now linked lists on both sides.
- **Static props on intrinsic elements** reach Dart, inside the node's create op.
- **`fuse build --js-only`** works and is documented. It never existed on main, so this is a new flag, not a restored one.
- **Compiler helpers `ref` and `applyRef`** were not exported from the package entry; a module using `ref` could not have resolved them. I found this while reading the compiler output.

**Measured, main to branch head**

| Operation | JS harness, median ms | App JS ms, semantics off | App end to end ms, semantics off |
|---|---|---|---|
| mount 1,000 | 36.0 to 18.7 | 47.5 to 28.6 | 88.6 to 74.2 |
| mount 5,000 | 197.5 to 103.9 | 257 to 146 | 436 to 277 |
| list replace 500 | 102.0 to 45.3 | 139 to 68.0 | 228 to 156 |
| sort 2,000 | 230.8 to 8.9 | 245 to 16.5 | no frame to 80.9 |

A 1,000-node mount batch shrinks from 236 KB to 81 KB.

**Also done:** `FuseNode` constructor, flat op journal with a format version, and cheaper wrappers through a per-prop `spread`.

**Proposed only:** compiling `View`/`Text` as intrinsics, templates, a higher JS build target, a binary journal, and one Flutter element per node.

**Open issues**
- The UI thread for mounts is unchanged with semantics on (41.0 to 40.1 ms).
- A node removed in one batch and re-inserted in a later one still fails. This predates the branch.
- Intermediate commits carry a stale demo bundle, so the integration test only passes at the head.

## Part 1: design note

### What the new stack gives a custom renderer

**`@solidjs/universal` 2.0.3** (`types/index.d.ts`, `dist/universal.js`)
- **Hooks:** `createElement(tag, staticProps?)`, `createTextNode`, optional `createSentinel`, `replaceText`, `isTextNode`, `setProperty(node, name, value, prev?)`, `insertNode(parent, node, anchor?)`, `removeNode`, optional `cleanupNodes(parent, nodes)`, `getParentNode`, `getFirstChild`, `getNextSibling`.
- **Returned renderer:** adds `applyRef` and `ref`. `spread` accepts an array of sources. `effect`, `insert` and `spread` accept `RendererEffectOptions`.
- **`effect`** is `createRenderEffect` with `{ transparent: true, sync: true }`.
- **`insert`** creates no effect for a non-function value. For an accessor it creates one effect, and a nested one when the value is itself a function such as a `For` memo.
- **`spread`** on a plain props object uses one effect that copies and diffs every prop. It inserts `children` without an effect only when `children` is a data property.
- **`reconcileArrays`** assumes DOM semantics: `insertNode` on an attached node moves it, and `replaceNode` is insert followed by remove. That assumption is what broke main.

**Compiler 2.0.2, universal mode** (`types.d.ts`, compiled samples)
- **Intrinsics:** `createElement("view", { ...statics, including functions })`, one `effect` per dynamic prop (grouped when there are several), `insert` for dynamic children, `ref(() => fn, el)`.
- **Components:** `createComponent(View, { literal: value, get dynamic() {}, get children() {}, ref(r$) { ... applyRef ... } })`.
- **Spreads:** `spread(el, props, false)`, or `spread(el, [props, {...}], true)` plus an `insert`.
- **No templates or hoisting** in universal mode.
- **`renderers`** cannot make `View` an intrinsic. It only accepts the `dom` override ("dynamic renderers only support the `dom` renderer override"). With `generate: "dynamic"` it emits `template("<svg><view height=2></svg>")` from the DOM module: an HTML string with untyped attributes. I consider that route a hack.
- **Capitalised tags are always components.** The only compiler-free lever is the literal-versus-getter encoding of props, which Solid 2 exposes publicly as `isStatic` and `$PROXY`.
- **For wrappers to cost nothing** they must be rewritten to intrinsics before the compiler runs: a Vite `enforce: "pre"` plugin that resolves named imports from `solid-fuse`.

**fjs 3.3.2** (`CHANGELOG.md`, `libfjs/src/api/value.rs`, `engine.rs`)
- **Value conversion** is capped at 100,000 nodes and depth 128.
- **`JsValue::Bytes`** carries an ArrayBuffer or typed array as one value.
- **The bridge is async only.** There is no synchronous JS-to-Dart call.
- **Driver** is event-driven since 3.0.
- **Also available:** `set_gc_threshold`, `run_gc`, `memory_usage`, and script and bundle bytecode evaluation.
- **Class fields:** I did not check which ECMAScript level QuickJS-ng 0.17 supports. The bundle is built at `es2020`, which is why class fields compile to helpers.

**Solid 2.0.3**
- **`isStatic(props, key)`** is the public contract for reading the caller's literal-versus-expression classification.
- **`<For>` is keyed by default.** The list-move regression was in our hooks, not in `For`.
- **No time-slicing hook** in the installed types. `flush()` is all or nothing; `schedule: true` only defers an effect to the queue.
- **Async** (`Loading`, `isPending`, `latest`) and `onFlush` exist. I did not evaluate replacing our microtask flush with `onFlush`.
- **`@once`** did not make a prop static in the sample I compiled; it still went through an effect.

### Desired design

1. **Intrinsic static props (implemented).** `createElement` applies `staticProps` through the same path as `setProperty`. Any prop set while the node's create op is still unsent is written into that op. Node references stay separate ops.
2. **Built-in wrappers (runtime half implemented, compile half proposed).** `spread` decides per prop for a plain props object: literals are set once, getters share one effect, and stores and merges keep the universal path. Measured: mount 1,000 from 27.5 to 18.7 ms. The compile half is the `pre` plugin that rewrites named `solid-fuse` imports to intrinsics. It would also remove the children effect and `createComponent` per wrapper. My estimate is a further 25 to 30%, based on the old-stack step (29.0 to 21.0 ms); it is not re-measured here.
3. **Op format (implemented).** One flat array of opcodes and operands, sent as one JSON string with a version field. A binary journal over `Bytes` is possible, but writing bytes from QuickJS is likely slower than native `JSON.stringify`. Measure before building it.
4. **Keyed moves (implemented).** Linked child lists in JS and Dart. The insert op names the sibling it goes before. An insert of an attached node is a move on both sides. Dart disposes removed nodes at the end of the batch.
5. **Left for a template compiler.** Cloning static subtrees from one template op, and hoisting constant prop objects. The old stack measured 2.0 ms for mount 1,000 with templates; that is not re-measured on the new stack.

## Commits

Harness figures are JS ms medians over 5 alternating rounds (n = 20 for mount 1,000, 10 for mount 5,000, 15 for replace and sort). Load average was 0.22 to 0.80. Each row is cumulative.

| Commit | Change | mount 1,000 | mount 5,000 | replace 500 | sort 2,000 |
|---|---|---:|---:|---:|---:|
| (main) | baseline | 36.0 | 197.5 | 102.0 | 230.8 |
| `d0c9423` | `bun run test` uses Solid's client build; one navigator test needed a `flush()` | – | – | – | – |
| `5acfcdb` | Keyed moves: detach before insert in JS and Dart, deferred disposal, `FuseRuntime.forTest()` | 35.5 | 198.0 | 104.5 | 141.8 |
| `ab5041e` | Static props, folded into the create op; `createHandle` uses the same path | 36.9 | 197.8 | 115.3 | 142.6 |
| `e4b41b6` | `FuseNode` constructor; unread JS `props` mirror removed | 31.3 | 170.1 | 91.0 | 151.7 |
| `66fd037` | Linked child lists; insert carries `before` | 30.9 | 180.3 | 97.4 | 12.2 |
| `41b8c94` | Flat journal with version; the unused `ops` fallback removed | 27.5 | 141.5 | 72.0 | 8.6 |
| `a6ca125` | Export `ref`, `applyRef`, `Repeat`, `Reveal` | – | – | – | – |
| `8998e74` | Per-prop `spread` | 18.7 | 103.9 | 45.3 | 8.9 |
| `1b722ba` | `fuse build --js-only` | – | – | – | – |
| `b8bd29a` | Nodes keep a journal slot, not the props object; an unserialisable batch is dropped | not measured separately | | | |
| `6b43364` | Demo list screen and integration order check; bundle rebuilt | – | – | – | – |

- **Other list moves, main to head:** filter 260.6 to 7.0, shuffle 254.5 to 9.1, reverse 374.8 to 6.4.
- **Batch size, mount 1,000:** 236 KB, then 163 KB after folding, 153 KB after `before`, 81 KB after the flat journal.
- **The static-props commit shows no mount gain** because the benchmark screens only use wrappers.

**App level** (release Linux under xvfb, semantics off / on). Main is one pass of 3 reps today; the branch is 4 passes of 3 reps. Only the first pass was interleaved with main, because main's list moves time out and each main run takes over four minutes.

| Operation | Metric | Main | Branch |
|---|---|---:|---:|
| mount 1,000 | JS | 47.5 / 52.7 | 28.6 / 30.3 |
| mount 1,000 | UI thread | 27.1 / 41.0 | 22.2 / 40.1 |
| mount 1,000 | end to end | 88.6 / 103 | 74.2 / 87.7 |
| mount 1,000 | `jsonDecode` | 4.6 | 0.98 |
| mount 1,000 | `applyOps` | 1.5 | 0.42 |
| mount 5,000 | end to end | 436 / 474 | 277 / 368 |
| list replace 500 | end to end | 228 / 292 | 156 / 195 |
| sort 2,000 | JS | 245 / 249 | 16.5 / 15.0 |
| sort 2,000 | UI thread | no frame | 39.4 / 104 |
| sort 2,000 | end to end | no frame | 80.9 / 141 |

With semantics on, sort spends about 58 ms of its frame in semantics.

## Tests

- **JS, per file:** `src/renderer.test.ts` 24 pass (new), `src/navigator.test.ts` 9 pass, `cli/build/app.test.ts` 2 pass (new).
- **Dart, per file:** `test/apply_ops_test.dart` 17 pass (new), `test/color_parsing_test.dart` 6 pass.
- **`flutter analyze`:** 20 issues, identical to a clean checkout of main.
- **Demo integration test:** passes at the head, including on-screen order after reverse, sort and thin, and the 40-pixel row height from a static intrinsic prop. It also passes on clean main with the old test.
- **Docs updated:** `architecture.mdx`, `extending/creating-widgets.mdx`, `extending/packaging.mdx`, `README.md`.

## Open questions for the owner

1. **Wire version and over-the-air bundles.** The new Dart runtime rejects a bundle with a different op version, with a clear message. An old runtime given a new bundle fails with a cast error. Is a hard version check the right policy, or should the runtime read older formats?
2. **API changes.** In JS, `FuseNode.props` is gone and `children` is a getter that returns a new array. In Dart, `FuseNode.children` is an unmodifiable snapshot and `insertChildSilent` takes `(child, {before})`. Nothing in the repo or docs used the old forms; external packages might.
3. **Re-insert in a later batch.** Dart disposes a removed node at batch end, so a node kept in a variable and re-inserted later throws. The handler map in JS also never drops entries for removed nodes. Both predate the branch; a proper fix needs disposal driven from JS, which is a small redesign.
4. **Build target.** Should it move above `es2020`? I did not measure it.
5. **Stale bundle in intermediate commits.** The tracked demo bundle is rebuilt only in the last commit. Say if you want it rebuilt per commit.

## Caveats and locations

- **Harness binary.** Two prebuilt harness binaries in `/home/claude/wt/rebase` differ in absolute speed (37 against 70 ms for the same baseline mount). I used the newer one throughout, so compare only within the table. The harness also reads lower than the app (18.7 against 28.6 ms for mount 1,000).
- **Not done.** The Dart block-list editor (the linked list replaces it), the Dart one-element-per-node change, anything in the vendored fjs Rust, and templates.
- **Measurement branch.** Local branch `bench/mainfix` in `/home/claude/wt/mainfix-bench` is the fix branch plus the bench commits. Raw results are in `examples/perf_bench/results/mainfix/` there.
- **Untracked leftovers** in the fix worktree: `examples/demo/dart/linux/` and `bundle.js.map`.

Main files: `/home/claude/wt/mainfix/packages/solid-fuse/src/renderer.ts`, `/home/claude/wt/mainfix/packages/solid-fuse/dart/lib/src/runtime.dart`, `/home/claude/wt/mainfix/packages/solid-fuse/dart/lib/src/node.dart`.
