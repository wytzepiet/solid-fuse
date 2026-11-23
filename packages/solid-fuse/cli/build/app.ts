import { spawnSync } from "child_process";
import { build as viteBuild } from "vite";
import { getDartRoot } from "../utils";
import { buildViteConfig } from "../config";
import { runLink } from "../link";
import type { FuseConfig } from "../../src/config";

/**
 * Split `fuse build` arguments into our own flags and the rest, which goes
 * to `flutter build` untouched.
 *
 *   --js-only   build the JS bundle and stop: no Flutter build
 */
export function parseBuildArgs(rawArgs: string[]) {
  return {
    jsOnly: rawArgs.includes("--js-only"),
    flutterArgs: rawArgs.filter((arg) => arg !== "--js-only"),
  };
}

export async function buildApp(
  projectRoot: string,
  fuseConfig: FuseConfig | null,
  rawArgs: string[],
) {
  const { jsOnly, flutterArgs } = parseBuildArgs(rawArgs);
  // Generation runs in the Vite build (cli/gen/plugin.ts).
  await runLink(projectRoot, { pubGet: false, gen: false });

  const dartRoot = getDartRoot(projectRoot, fuseConfig);
  const viteConfig = buildViteConfig(projectRoot, fuseConfig);

  console.log("\nBuilding JS bundle...");
  await viteBuild(viteConfig);

  if (jsOnly) {
    console.log("\nDone! (--js-only: skipped the Flutter build)");
    return;
  }

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
}

