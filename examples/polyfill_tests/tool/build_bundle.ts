// Shared builder for the integration-test JS bundles.
//
// Runs the same vite-plugin-solid pipeline `fuse build` uses (generate:
// "universal", moduleName: "solid-fuse") against a test entry in the demo
// package, producing a self-contained IIFE the QuickJS engine can eval — real
// SolidJS 2.0, no externals.
//
// vite and vite-plugin-solid are resolved from the solid-fuse package (where
// they're installed) via Bun.resolveSync, NOT from this script's location or
// the cwd — so the build runs from anywhere:
//
//   bun examples/polyfill_tests/tool/build_<x>_bundle.ts

import { resolve } from "path";

const repoRoot = process.env.FUSE_REPO_ROOT ?? resolve(import.meta.dir, "../../..");
const pkgDir = resolve(repoRoot, "packages/solid-fuse");
const demoRoot = resolve(repoRoot, "examples/demo");
const outDir = resolve(repoRoot, "examples/polyfill_tests/assets/js");

// Resolve from the package dir, honouring its node_modules and export
// conditions, then import the resolved absolute paths.
const { build } = await import(Bun.resolveSync("vite", pkgDir));
const solidPlugin = (await import(Bun.resolveSync("vite-plugin-solid", pkgDir)))
  .default;

/** Build one demo test entry into a named IIFE bundle in the test assets dir. */
export async function buildBundle(opts: {
  /** Entry filename under examples/demo/src, e.g. "tabs-test-entry.tsx". */
  entry: string;
  /** IIFE global name, e.g. "FuseTabsTest". */
  name: string;
  /** Output filename, e.g. "tabs_bundle.js". */
  fileName: string;
}) {
  await build({
    configFile: false,
    root: demoRoot,
    plugins: [
      solidPlugin({ solid: { generate: "universal", moduleName: "solid-fuse" } }),
    ],
    build: {
      target: "es2020",
      minify: false,
      emptyOutDir: false,
      sourcemap: false,
      lib: {
        entry: resolve(demoRoot, "src", opts.entry),
        formats: ["iife"],
        name: opts.name,
        fileName: () => opts.fileName,
      },
      outDir,
    },
  });
  console.log(`Built ${opts.fileName} -> ${outDir}/${opts.fileName}`);
}
