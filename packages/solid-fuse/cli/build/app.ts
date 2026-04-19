import { spawnSync } from "child_process";
import { build as viteBuild } from "vite";
import { getDartRoot } from "../utils";
import { buildViteConfig } from "../config";
import { runLink } from "../link";
import type { FuseConfig } from "../../src/config";

export async function buildApp(
  projectRoot: string,
  fuseConfig: FuseConfig | null,
  rawArgs: string[],
) {
  await runLink(projectRoot, { pubGet: false });

  const dartRoot = getDartRoot(projectRoot, fuseConfig);
  const viteConfig = buildViteConfig(projectRoot, fuseConfig);

  console.log("\nBuilding JS bundle...");
  await viteBuild(viteConfig);

  console.log("\nBuilding Flutter app...");
  const flutter = spawnSync("flutter", ["build", ...rawArgs], {
    cwd: dartRoot,
    stdio: "inherit",
  });
  if (flutter.status !== 0) {
    console.error("Flutter build failed");
    process.exit(flutter.status ?? 1);
  }

  console.log("\nDone!");
}
