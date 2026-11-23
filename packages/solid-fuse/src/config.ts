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
  /**
   * Value builders whose calls fold to constants when every argument is a
   * literal (`EdgeInsets.all(8)`), per module they are imported from. `fuse
   * gen` writes these tables for the modules it generates.
   */
  builders?: Record<string, Record<string, { tag: string; positional: string[] } | { const: string }>>;
}

/**
 * `fuse gen`: TypeScript components and Dart adapters generated from Dart.
 * What crosses is what `dart/lib/fuse.dart` exports, and the `lib/fuse.dart`
 * of any package that has one.
 */
export interface FuseGenOptions {
  /** Directory of the generated modules, imported as `#fuse/<package>`. Default "fuse". */
  out?: string;
}

export interface FuseConfig {
  /** Mark this package as a Fuse library. Enables `fuse build` library mode. */
  library?: boolean;
  /** Name of the Dart function that registers the package's hand-written
   *  widgets, handles and routes. Leave it out when all its Dart is
   *  generated from `lib/fuse.dart`. */
  register?: string;
  /** Path to Dart package directory, defaults to "dart" (for libraries) */
  dart?: string;
  /** @solidjs/vite-plugin options. Fuse sets generate: "universal" and moduleName: "solid-fuse" as defaults. */
  solid?: Partial<SolidOptions>;
  /** Options of Fuse's own compile step (templates, wrapper components). */
  compile?: FuseCompileOptions;
  /** Generated components (`fuse gen`). */
  gen?: FuseGenOptions;
  /** Vite config overrides, merged with Fuse defaults (for apps) */
  vite?: UserConfig;
}

/** Define a Fuse config with type checking. */
export function defineConfig(config: FuseConfig): FuseConfig {
  return config;
}
