import type { UserConfig } from "vite";
import type { Options as SolidOptions } from "@solidjs/vite-plugin";

/** Options of the compile step that runs in front of Solid's JSX compiler. */
export interface FuseCompileOptions {
  /**
   * Lift the constant part of JSX (element types, literal props and text)
   * into templates that Dart builds natively. On by default; `false` is an
   * escape hatch for tracking down a problem.
   */
  templates?: boolean;
  /**
   * Components that only render one element with their props spread on it
   * (`props => <chart {...props} />`), per module they are imported from:
   * `{ "my-widgets": { Chart: "chart" } }`. They are compiled as that
   * element. The solid-fuse components are known already.
   */
  intrinsics?: Record<string, Record<string, string>>;
}

export interface FuseConfig {
  /** Mark this package as a Fuse library. Enables `fuse build` library mode. */
  library?: boolean;
  /** Name of the Dart registration function. Defaults to "register". */
  register?: string;
  /** Path to Dart package directory, defaults to "dart" (for libraries) */
  dart?: string;
  /** @solidjs/vite-plugin options. Fuse sets generate: "universal" and moduleName: "solid-fuse" as defaults. */
  solid?: Partial<SolidOptions>;
  /** Options of Fuse's own compile step (templates, wrapper components). */
  compile?: FuseCompileOptions;
  /** Vite config overrides, merged with Fuse defaults (for apps) */
  vite?: UserConfig;
}

/** Define a Fuse config with type checking. */
export function defineConfig(config: FuseConfig): FuseConfig {
  return config;
}
