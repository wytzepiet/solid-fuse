import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { build as viteBuild, mergeConfig, type InlineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { defu } from "defu";
import { detectPackageManager, pmExec } from "../utils";
import type { FuseConfig } from "../../src/config";

export async function buildLibrary(projectRoot: string, fuseConfig: FuseConfig) {
  const pkgJson = JSON.parse(
    readFileSync(join(projectRoot, "package.json"), "utf-8"),
  );

  const userLib = fuseConfig.vite?.build?.lib;
  const entry =
    userLib && typeof userLib === "object" && "entry" in userLib
      ? undefined
      : resolveEntry(projectRoot);

  const externals = [
    "solid-js",
    "@solidjs/universal",
    "solid-fuse",
    ...Object.keys(pkgJson.peerDependencies ?? {}),
    ...Object.keys(pkgJson.dependencies ?? {}),
  ];

  const solidOptions = defu(fuseConfig.solid ?? {}, {
    solid: { generate: "universal" as const, moduleName: "solid-fuse" },
  });

  const fuseDefaults: InlineConfig = {
    configFile: false,
    root: projectRoot,
    plugins: [solidPlugin(solidOptions)],
    build: {
      target: "es2020",
      emptyOutDir: true,
      sourcemap: true,
      outDir: resolve(projectRoot, "dist"),
      lib: entry
        ? { entry, formats: ["es"], fileName: () => "index.js" }
        : undefined,
      rollupOptions: { external: externals },
    },
  };

  console.log("\nBuilding library JS...");
  await viteBuild(mergeConfig(fuseDefaults, fuseConfig.vite ?? {}));

  console.log("\nEmitting type declarations...");
  const tscConfig = existsSync(join(projectRoot, "tsconfig.build.json"))
    ? "tsconfig.build.json"
    : "tsconfig.json";
  const { cmd, args: pmArgs } = pmExec(detectPackageManager(projectRoot));
  const tsc = spawnSync(
    cmd,
    [
      ...pmArgs,
      "tsc",
      "-p",
      tscConfig,
      "--emitDeclarationOnly",
      "--declaration",
      "--declarationMap",
      "--outDir",
      "dist",
    ],
    { cwd: projectRoot, stdio: "inherit" },
  );
  if (tsc.status !== 0) {
    console.error("tsc failed");
    process.exit(tsc.status ?? 1);
  }

  console.log("\nDone!");
}

function resolveEntry(projectRoot: string): string {
  for (const ext of ["ts", "tsx", "js", "jsx"]) {
    const p = resolve(projectRoot, `src/index.${ext}`);
    if (existsSync(p)) return p;
  }
  throw new Error(
    "No library entry found. Expected src/index.{ts,tsx,js,jsx}.",
  );
}
