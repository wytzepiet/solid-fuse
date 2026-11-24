import { existsSync, readFileSync, realpathSync } from "fs";
import { dirname, join, resolve } from "path";
import { mergeConfig, type InlineConfig } from "vite";
import solidPlugin from "@solidjs/vite-plugin";
import { defu } from "defu";
import type { FuseConfig } from "../src/config";
import { fuseDevErrorPlugin } from "./dev-error-plugin";
import { fuseCompilePlugin } from "./compile-plugin";
import { fuseGenPlugin, generatedTables } from "./gen/plugin";
import type { BundleUse } from "./gen/shake";
import { fuseRoutesPlugin } from "./routes";
import { fuseFakesPlugin } from "./fakes";

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
 * The fuse packages the app depends on, directly or through other packages
 * (a package with a fuse.config next to its package.json), solid-fuse
 * included. Follows the dependency graph the way Node resolves it, so it
 * finds them under any linker: hoisted (npm), or nested and isolated (bun,
 * pnpm), where `@solid-fuse/adaptive`'s material is not in the app's own
 * node_modules.
 */
export function fuseDependencies(projectRoot: string): { name: string; dir: string }[] {
  const found = new Map<string, string>();
  const seen = new Set<string>();
  const deps = (dir: string, root: boolean): string[] => {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
      return Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies, ...(root ? pkg.devDependencies : {}) });
    } catch {
      return [];
    }
  };
  const resolveFrom = (from: string, name: string): string | null => {
    for (let dir = from; ; dir = dirname(dir)) {
      const candidate = join(dir, "node_modules", name);
      if (existsSync(join(candidate, "package.json"))) return candidate;
      if (dirname(dir) === dir) return null;
    }
  };
  const visit = (dir: string, root: boolean) => {
    for (const name of deps(dir, root)) {
      const pkgDir = resolveFrom(dir, name);
      if (!pkgDir) continue;
      // Its own dependencies resolve from where it really is (an isolated
      // linker's store); the app keeps the path it sees it at.
      const real = realpathSync(pkgDir);
      if (seen.has(real)) continue;
      seen.add(real);
      if (!CONFIG_FILES.some((f) => existsSync(join(real, f)))) continue;
      if (!found.has(name)) found.set(name, pkgDir);
      visit(real, false);
    }
  };
  visit(resolve(projectRoot), true);
  return [...found].map(([name, dir]) => ({ name, dir }));
}

/**
 * The npm names of the fuse packages the app depends on, solid-fuse aside.
 * They ship TypeScript source that imports the app's generated modules
 * (`#fuse/<package>`), so the app's own plugins compile them and Vite must
 * not pre-bundle them.
 */
export function fusePackageNames(projectRoot: string): string[] {
  return fuseDependencies(projectRoot).map((d) => d.name).filter((n) => n !== "solid-fuse");
}

/**
 * Build a Vite InlineConfig from a FuseConfig, merging Fuse defaults with user overrides.
 * [use], in `fuse build`, collects what the bundle uses of the generated
 * modules (cli/gen/shake.ts).
 */
export function buildViteConfig(
  projectRoot: string,
  fuseConfig: FuseConfig | null,
  use?: BundleUse,
  options: { fakes?: boolean } = {},
): InlineConfig {
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
      // `src/app/` as routes (`#fuse/routes`), before anything imports them.
      fuseRoutesPlugin({ projectRoot, genDir }),
      // `src/fakes.ts` first, where fakes are on (cli/fakes.ts).
      fuseFakesPlugin({ projectRoot, on: !!options.fakes }),
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
