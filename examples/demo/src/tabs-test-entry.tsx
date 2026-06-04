// Integration-test entry for the tab system (TabController, TabBar,
// TabBarView, Tab, DefaultTabController).
//
// This is NOT app code — it's the JS half of
// examples/polyfill_tests/integration_test/tabs_test.dart. It runs the REAL
// SolidJS 2.0 renderer inside the QuickJS engine, emits real `_ops` to the
// Dart FuseRuntime, and renders two tab setups so the Dart test can assert the
// resulting Flutter widget tree and controller wiring.
//
// Two paths, matching the two ways to get a controller:
//   1. Explicit  — one createTabController() shared by a <TabBar> and a
//      <TabBarView>. The index is mirrored to Dart over `test:tabIndex`, and
//      `test:jumpTo` drives it programmatically.
//   2. Implicit  — a <DefaultTabController> wires the controller through
//      context to a <TabBar> in a <SliverAppBar>'s `bottom` slot and a
//      <TabBarView> below, with no explicit handle (the "tabs under an app
//      bar" combo).
//
// Built into examples/polyfill_tests/assets/js/tabs_bundle.js by
// examples/polyfill_tests/tool/build_tabs_bundle.ts.

import { createEffect } from "solid-js";
import {
  channels,
  createTabController,
  CustomScrollView,
  DefaultTabController,
  render,
  send,
  SliverAppBar,
  SliverFillRemaining,
  Tab,
  TabBar,
  TabBarView,
  Text,
  View,
} from "solid-fuse";

// ── 1. Explicit controller, shared by the bar and the view ──────────────────

const controller = createTabController({ length: 2 });

// Mirror the selected index to Dart whenever a tap or swipe changes it.
// Solid 2.0's createEffect takes (compute, effect): the first reads reactively,
// the second runs with that value.
createEffect(
  () => controller.index(),
  (index) => send("test:tabIndex", { index }),
);

// Let the Dart test drive the controller programmatically.
channels.on("test:jumpTo", (data: { index: number }) => {
  controller.jumpTo(data.index);
  return { ok: true };
});

const Explicit = () => (
  <View height={220} flex={{ direction: "vertical" }}>
    <TabBar controller={controller}>
      <Tab text="tab-A" />
      <Tab text="tab-B" />
    </TabBar>
    <View grow={1} fit="tight">
      <TabBarView controller={controller}>
        <View>
          <Text>page-A</Text>
        </View>
        <View>
          <Text>page-B</Text>
        </View>
      </TabBarView>
    </View>
  </View>
);

// ── 2. DefaultTabController, tabs under a SliverAppBar ───────────────────────

const Sliver = () => (
  <View height={300}>
    <DefaultTabController length={2}>
      <CustomScrollView>
        <SliverAppBar
          pinned
          title={<Text>Tabbed</Text>}
          bottom={
            <TabBar>
              <Tab text="sliver-A" />
              <Tab text="sliver-B" />
            </TabBar>
          }
          bottomHeight={48}
        />
        <SliverFillRemaining>
          <TabBarView>
            <View>
              <Text>sliver-page-A</Text>
            </View>
            <View>
              <Text>sliver-page-B</Text>
            </View>
          </TabBarView>
        </SliverFillRemaining>
      </CustomScrollView>
    </DefaultTabController>
  </View>
);

const App = () => (
  <View flex={{ direction: "vertical", expand: true }}>
    <Explicit />
    <Sliver />
  </View>
);

render(App);

// Tell Dart the bundle finished its initial render so it can stop pumping.
send("test:ready", {});
