// Builds the JS half of the Image integration test into
// examples/polyfill_tests/assets/js/image_bundle.js.
//
// Run from anywhere:  bun examples/polyfill_tests/tool/build_image_bundle.ts

import { buildBundle } from "./build_bundle";

await buildBundle({
  entry: "image-test-entry.tsx",
  name: "FuseImageTest",
  fileName: "image_bundle.js",
});
