import { spawnSync } from "child_process";
import { defineCommand } from "citty";
import { findProjectRoot, detectPackageManager, pmExec } from "./utils";
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

    // Step 2: Vite build
    const pm = detectPackageManager(projectRoot);
    const exec = pmExec(pm);
    console.log("\nBuilding JS bundle...");
    const vite = spawnSync(exec.cmd, [...exec.args, "vite", "build"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    if (vite.status !== 0) {
      console.error("Vite build failed");
      process.exit(vite.status ?? 1);
    }

    // Step 3: Flutter build — everything in rawArgs passes through (citty strips the subcommand)
    const flutterArgs = rawArgs;

    console.log("\nBuilding Flutter app...");
    const flutter = spawnSync("flutter", ["build", ...flutterArgs], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    if (flutter.status !== 0) {
      console.error("Flutter build failed");
      process.exit(flutter.status ?? 1);
    }

    console.log("\nDone!");
  },
});
