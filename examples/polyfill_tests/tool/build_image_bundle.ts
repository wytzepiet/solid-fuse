// Builds the JS half of the Image integration test into
// examples/polyfill_tests/assets/js/image_bundle.js.
//
// Runs the same vite-plugin-solid pipeline `fuse build` uses (generate:
// "universal", moduleName: "solid-fuse") against the test entry in the demo
// package (where `solid-fuse` and `solid-js` resolve via the Bun workspace),
// producing a self-contained IIFE the QuickJS engine can eval — real SolidJS
// 2.0, no externals.
//
// Run from anywhere:  bun examples/polyfill_tests/tool/build_image_bundle.ts

import { resolve } from "path";
import { build } from "vite";
import solidPlugin from "vite-plugin-solid";

// Absolute repo root so this works regardless of where Bun resolves node_modules
// from (we run it from the solid-fuse package dir, where vite is installed).
const repoRoot = process.env.FUSE_REPO_ROOT ?? resolve(import.meta.dir, "../../..");
const demoRoot = resolve(repoRoot, "examples/demo");
const entry = resolve(demoRoot, "src/image-test-entry.tsx");
const outDir = resolve(repoRoot, "examples/polyfill_tests/assets/js");

await build({
  configFile: false,
  root: demoRoot,
  plugins: [
    solidPlugin({
      solid: { generate: "universal", moduleName: "solid-fuse" },
    }),
  ],
  build: {
    target: "es2020",
    minify: false,
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry,
      formats: ["iife"],
      name: "FuseImageTest",
      fileName: () => "image_bundle.js",
    },
    outDir,
  },
});

console.log(`Built image_bundle.js -> ${outDir}/image_bundle.js`);
