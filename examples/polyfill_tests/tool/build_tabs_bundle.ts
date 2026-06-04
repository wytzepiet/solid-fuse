// Builds the JS half of the tabs integration test into
// examples/polyfill_tests/assets/js/tabs_bundle.js.
//
// Run from anywhere:  bun examples/polyfill_tests/tool/build_tabs_bundle.ts

import { buildBundle } from "./build_bundle";

await buildBundle({
  entry: "tabs-test-entry.tsx",
  name: "FuseTabsTest",
  fileName: "tabs_bundle.js",
});
