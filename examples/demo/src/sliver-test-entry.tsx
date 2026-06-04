// Integration-test entry for the sliver suite + core protocol changes.
//
// This is NOT app code — it's the JS half of
// examples/polyfill_tests/integration_test/slivers_test.dart. It runs the REAL
// SolidJS 2.0 renderer inside the QuickJS engine (the only place Solid 2.0 beta
// reactivity runs truthfully — it's inert in bun), emits real `_ops` to the
// Dart FuseRuntime, and exposes test hooks over channels so the Dart test can
// drive signals and observe results.
//
// Built into examples/polyfill_tests/assets/js/sliver_bundle.js by
// examples/polyfill_tests/tool/build_sliver_bundle.ts.

import { createSignal, Show } from "solid-js";
import {
  render,
  on,
  send,
  For,
  View,
  Text,
  CustomScrollView,
  NestedScrollView,
  SliverAppBar,
  SliverList,
  SliverToBoxAdapter,
  SliverPadding,
  CupertinoSliverRefreshControl,
} from "solid-fuse";

// --- Reactive state the Dart test drives ---

// Rows 0..N-1, each with a reactive label. Mutating the signal for one row must
// granularly rebuild only that row (Solid's <For> + per-row signal).
const ROW_COUNT = 5;
const rowSignals = Array.from({ length: ROW_COUNT }, (_, i) =>
  createSignal(`row-${i}`),
);

// The Dart test flips one row's label through this channel, then re-asserts.
on("test:setRow", (data: { index: number; label: string }) => {
  const sig = rowSignals[data.index];
  if (sig) sig[1](data.label);
  return { ok: true };
});

// Whether the NestedScrollView header shows an EXTRA top-level sliver. The Dart
// test flips this to prove that a *structural* (count) change to the header
// slivers refreshes without a scroll — the bug the old <nestedScrollHeader>
// extraction had (structural changes went stale until the next scroll-driven
// headerSliverBuilder run).
const [headerExtra, setHeaderExtra] = createSignal(false);
on("test:setHeaderExtra", (data: { value: boolean }) => {
  setHeaderExtra(data.value);
  return { ok: true };
});

// onRefresh round-trip: Dart awaits this Promise (via node.asyncCallback ->
// _functionCallAsync channel). It resolves to a sentinel string so the Dart
// side can assert the resolved value flowed back across the bridge.
async function handleRefresh(): Promise<string> {
  // A real async hop so we prove Dart awaits the Promise, not a sync return.
  await new Promise((r) => setTimeout(r, 10));
  send("test:refreshRan", {});
  return "refreshed-ok";
}

const Slivers = () => (
  <CustomScrollView>
    <SliverAppBar
      title={<Text>Sliver Suite</Text>}
      actions={[
        <Text>action-A</Text>,
        <Text>action-B</Text>,
      ]}
      pinned
    />

    {/* Pull-to-refresh: async callback round-trip. The widget's onRefresh
        contract is `() => Promise<void>` (Flutter discards the value), but this
        test drives node.asyncCallback('onRefresh') directly and asserts the
        resolved value crosses the bridge — hence handleRefresh resolves to a
        sentinel and we cast past the void contract here (test-only). */}
    <CupertinoSliverRefreshControl
      onRefresh={handleRefresh as unknown as () => Promise<void>}
    />

    {/* SliverToBoxAdapter nested inside SliverPadding (sliver wrapping a sliver). */}
    <SliverPadding padding={{ all: 8 }}>
      <SliverToBoxAdapter>
        <View>
          <Text>adapter-box</Text>
        </View>
      </SliverToBoxAdapter>
    </SliverPadding>

    {/* N reactive rows. <For> keeps identity; each row reads its own signal so
        flipping one signal rebuilds only that row. */}
    <SliverList>
      <For each={rowSignals}>
        {([label]) => (
          <View>
            <Text>{label()}</Text>
          </View>
        )}
      </For>
    </SliverList>
  </CustomScrollView>
);

// A NestedScrollView whose header's top-level sliver COUNT changes reactively.
// The header always has a pinned SliverAppBar; when `headerExtra()` is true it
// also renders a second top-level sliver. The body is a plain box (kept off the
// CustomScrollView type so the existing `findsOneWidget` assertion holds).
const Nested = () => (
  <NestedScrollView
    header={(innerBoxIsScrolled) => (
      <>
        {/* Always-present header sliver. Reflects innerBoxIsScrolled into its
            text to exercise the onHeader push path (a prop change on a stable
            sliver — the case the old design already handled). Deliberately NOT a
            SliverAppBar, to keep the global SliverAppBar count at one. */}
        <SliverToBoxAdapter>
          <View>
            <Text>nested-header:{String(innerBoxIsScrolled)}</Text>
          </View>
        </SliverToBoxAdapter>
        {/* Structural change: this top-level sliver appears/disappears with the
            `headerExtra` signal. Proves a header sliver COUNT change refreshes
            without a scroll. */}
        <Show when={headerExtra()}>
          <SliverToBoxAdapter>
            <View>
              <Text>header-extra</Text>
            </View>
          </SliverToBoxAdapter>
        </Show>
      </>
    )}
    body={
      <View>
        <Text>nested-body</Text>
      </View>
    }
  />
);

// Split the surface into two bounded halves with Expanded (grow + fit:tight) so
// neither section overflows regardless of the test window size: the top half is
// the original sliver suite, the bottom half the NestedScrollView.
const App = () => (
  <View flex={{ direction: "vertical", expand: true }}>
    <View grow={1} fit="tight">
      <Slivers />
    </View>
    <View grow={1} fit="tight">
      <Nested />
    </View>
  </View>
);

render(App);

// Tell Dart the bundle finished its initial render so it can stop pumping.
send("test:ready", {});
