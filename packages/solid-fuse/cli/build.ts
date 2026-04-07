import { spawnSync } from "child_process";
import { build as viteBuild } from "vite";
import { defineCommand } from "citty";
import { findProjectRoot, getDartRoot } from "./utils";
import { loadFuseConfig, buildViteConfig } from "./config";
import { runLink } from "./link";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build Vite bundle then Flutter app",
  },
  run: async ({ rawArgs }) => {
    const projectRoot = findProjectRoot();

    // Step 1: fuse link
    await runLink(projectRoot, { pubGet: false });

    // Step 2: Load fuse config and build Vite config
    const fuseConfig = await loadFuseConfig(projectRoot);
    const dartRoot = getDartRoot(projectRoot, fuseConfig);
    const viteConfig = buildViteConfig(projectRoot, fuseConfig);

    // Step 3: Vite build
    console.log("\nBuilding JS bundle...");
    await viteBuild(viteConfig);

    // Step 4: Flutter build — everything in rawArgs passes through (citty strips the subcommand)
    const flutterArgs = rawArgs;

    console.log("\nBuilding Flutter app...");
    const flutter = spawnSync("flutter", ["build", ...flutterArgs], {
      cwd: dartRoot,
      stdio: "inherit",
    });
    if (flutter.status !== 0) {
      console.error("Flutter build failed");
      process.exit(flutter.status ?? 1);
    }

    console.log("\nDone!");
  },
});
