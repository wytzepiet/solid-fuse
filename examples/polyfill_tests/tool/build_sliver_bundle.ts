// Builds the JS half of the sliver integration test into
// examples/polyfill_tests/assets/js/sliver_bundle.js.
//
// Run from anywhere:  bun examples/polyfill_tests/tool/build_sliver_bundle.ts

import { buildBundle } from "./build_bundle";

await buildBundle({
  entry: "sliver-test-entry.tsx",
  name: "FuseSliverTest",
  fileName: "sliver_bundle.js",
});
