import { existsSync } from "fs";
import { join, resolve } from "path";
import { mergeConfig, type InlineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { defu } from "defu";
import type { FuseConfig } from "../src/config";

const CONFIG_FILES = ["fuse.config.ts", "fuse.config.mjs", "fuse.config.js"];

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
 * Build a Vite InlineConfig from a FuseConfig, merging Fuse defaults with user overrides.
 */
export function buildViteConfig(projectRoot: string, fuseConfig: FuseConfig | null): InlineConfig {
  const solidOptions = defu(fuseConfig?.solid ?? {}, {
    solid: {
      generate: "universal" as const,
      moduleName: "solid-fuse",
    },
  });

  const fuseDefaults: InlineConfig = {
    root: projectRoot,
    plugins: [solidPlugin(solidOptions)],
    resolve: {
      preserveSymlinks: true,
    },
    build: {
      target: "es2020",
      minify: false,
      emptyOutDir: false,
      lib: {
        entry: resolve(projectRoot, "src/index.tsx"),
        formats: ["iife"],
        name: "Fuse",
        fileName: () => "bundle.js",
      },
      outDir: resolve(projectRoot, "assets/js"),
    },
  };

  return mergeConfig(fuseDefaults, fuseConfig?.vite ?? {});
}
