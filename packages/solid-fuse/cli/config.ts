import { existsSync } from "fs";
import { join, resolve } from "path";
import { mergeConfig, type InlineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { defu } from "defu";
import type { FuseConfig } from "../src/config";
import { fuseDevErrorPlugin } from "./dev-error-plugin";

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
 * Build a Vite InlineConfig from a FuseConfig, merging Fuse defaults with user overrides.
 */
export function buildViteConfig(projectRoot: string, fuseConfig: FuseConfig | null): InlineConfig {
  const dartRoot = join(projectRoot, fuseConfig?.dart ?? "dart");

  const solidOptions = defu(fuseConfig?.solid ?? {}, {
    solid: {
      generate: "universal" as const,
      moduleName: "solid-fuse",
    },
  });

  const fuseDefaults: InlineConfig = {
    configFile: false,
    root: projectRoot,
    plugins: [solidPlugin(solidOptions), fuseDevErrorPlugin()],
    optimizeDeps: {
      // Pre-bundle at server startup so hashes are stable before the device
      // connects. Without this, Vite discovers these deps from the first
      // request and re-optimizes mid-fetch, invalidating in-flight URLs.
      entries: ["src/index.tsx"],
      include: ["solid-fuse", "solid-js"],
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
