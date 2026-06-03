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

import { createSignal } from "solid-js";
import {
  render,
  on,
  send,
  For,
  View,
  Text,
  CustomScrollView,
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

// onRefresh round-trip: Dart awaits this Promise (via node.asyncCallback ->
// _functionCallAsync channel). It resolves to a sentinel string so the Dart
// side can assert the resolved value flowed back across the bridge.
async function handleRefresh(): Promise<string> {
  // A real async hop so we prove Dart awaits the Promise, not a sync return.
  await new Promise((r) => setTimeout(r, 10));
  send("test:refreshRan", {});
  return "refreshed-ok";
}

const App = () => (
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

render(App);

// Tell Dart the bundle finished its initial render so it can stop pumping.
send("test:ready", {});
