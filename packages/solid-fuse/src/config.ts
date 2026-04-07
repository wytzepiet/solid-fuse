import type { UserConfig } from "vite";
import type { Options as SolidOptions } from "vite-plugin-solid";

export interface FuseConfig {
  /** Name of the Dart registration function. Defaults to "register". */
  register?: string;
  /** Path to Dart package directory, defaults to "dart" (for libraries) */
  dart?: string;
  /** vite-plugin-solid options. Fuse sets generate: "universal" and moduleName: "solid-fuse" as defaults. */
  solid?: Partial<SolidOptions>;
  /** Vite config overrides, merged with Fuse defaults (for apps) */
  vite?: UserConfig;
}

/** Define a Fuse config with type checking. */
export function defineConfig(config: FuseConfig): FuseConfig {
  return config;
}
