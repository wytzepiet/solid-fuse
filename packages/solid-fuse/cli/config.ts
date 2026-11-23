import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { mergeConfig, type InlineConfig } from "vite";
import solidPlugin from "@solidjs/vite-plugin";
import { defu } from "defu";
import type { FuseConfig } from "../src/config";
import { fuseDevErrorPlugin } from "./dev-error-plugin";
import { fuseCompilePlugin } from "./compile-plugin";
import { fuseGenPlugin, generatedTables } from "./gen/plugin";
import type { BundleUse } from "./gen/shake";

export const CONFIG_FILES = ["fuse.config.ts", "fuse.config.mjs", "fuse.config.js"];

/**
 * Load a fuse.config.{ts,mjs,js} from the given directory.
 * Returns the default export, or null if no config file is found.
 */
export async function loadFuseConfig(
  dir: string
): Promise<FuseConfig | null> {
  for (const file of CONFIG_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;

    const mod = await import(path);
    return mod.default ?? mod;
  }
  return null;
}

/**
 * The npm names of the fuse packages the app depends on (a package with a
 * fuse.config next to its package.json), solid-fuse aside. They ship
 * TypeScript source that imports the app's generated modules
 * (`#fuse/<package>`), so the app's own plugins compile them and Vite must
 * not pre-bundle them.
 */
export function fusePackageNames(projectRoot: string): string[] {
  const nm = join(projectRoot, "node_modules");
  const list = (d: string) => {
    try {
      return readdirSync(d);
    } catch {
      return [];
    }
  };
  const names: string[] = [];
  const visit = (dir: string, name: string) => {
    if (name === "solid-fuse") return;
    if (existsSync(join(dir, "package.json")) && CONFIG_FILES.some((f) => existsSync(join(dir, f)))) names.push(name);
  };
  for (const e of list(nm)) {
    if (e.startsWith(".")) continue;
    if (e.startsWith("@")) for (const s of list(join(nm, e))) visit(join(nm, e, s), `${e}/${s}`);
    else visit(join(nm, e), e);
  }
  return names;
}

/**
 * Build a Vite InlineConfig from a FuseConfig, merging Fuse defaults with user overrides.
 * [use], in `fuse build`, collects what the bundle uses of the generated
 * modules (cli/gen/shake.ts).
 */
export function buildViteConfig(projectRoot: string, fuseConfig: FuseConfig | null, use?: BundleUse): InlineConfig {
  const dartRoot = join(projectRoot, fuseConfig?.dart ?? "dart");

  // `fuse gen` output: modules imported as `#fuse/<package>`, and the tables
  // that let the compile step treat their components and builders as constant.
  const genDir = resolve(projectRoot, fuseConfig?.gen?.out ?? "fuse");

  const solidOptions = defu(fuseConfig?.solid ?? {}, {
    solid: {
      generate: "universal" as const,
      moduleName: "solid-fuse",
    },
    // `fuse/<package>/<Owner>.tsx` hold value builders, no JSX. Solid's dev
    // refresh pass takes their PascalCase overloaded functions (`Cubic$call`)
    // for components and redeclares them, which fails to parse.
    exclude: [`${genDir}/*/**`],
  });
  const compile = { ...fuseConfig?.compile };
  const gen = fuseGenPlugin({ projectRoot, dartRoot, genDir, config: fuseConfig, use });

  const fuseDefaults: InlineConfig = {
    configFile: false,
    root: projectRoot,
    resolve: {
      alias: [{ find: /^#fuse\/(.*)$/, replacement: `${genDir}/$1.tsx` }],
    },
    // The compile step goes in front of Solid's compiler (both are "pre").
    plugins: [
      // Generation first: it writes the modules and tables the others read.
      gen,
      fuseCompilePlugin({ ...compile, moduleName: solidOptions.solid.moduleName, usage: gen.api.use, tables: generatedTables(genDir) }),
      solidPlugin(solidOptions),
      fuseDevErrorPlugin(),
    ],
    optimizeDeps: {
      // Pre-bundle at server startup so hashes are stable before the device
      // connects. Without this, Vite discovers these deps from the first
      // request and re-optimizes mid-fetch, invalidating in-flight URLs.
      entries: ["src/index.tsx"],
      // Both solid-fuse entries in one optimize run, so they share one
      // renderer. `solid-fuse/generated` is often first imported from a
      // design package, which is excluded from the scan; found later, it
      // would be bundled with a renderer of its own (its own node ids and
      // ops journal).
      include: ["solid-fuse", "solid-fuse/generated", "solid-js"],
      exclude: fusePackageNames(projectRoot),
    },
    build: {
      target: "es2020",
      minify: false,
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: resolve(projectRoot, "src/index.tsx"),
        formats: ["iife"],
        name: "Fuse",
        fileName: () => "bundle.js",
      },
      outDir: resolve(dartRoot, "assets/js"),
    },
  };

  return mergeConfig(fuseDefaults, fuseConfig?.vite ?? {});
}
