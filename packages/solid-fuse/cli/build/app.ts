import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { build as viteBuild } from "vite";
import { getDartRoot } from "../utils";
import { buildViteConfig } from "../config";
import { runLink } from "../link";
import { GENERATED_DART, genOutDir } from "../gen/command";
import { emitDart } from "../gen/emit-dart";
import { readManifest } from "../gen/manifest";
import { newBundleUse, shake, type BundleUse } from "../gen/shake";
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
  await runLink(projectRoot, { pubGet: false });

  const dartRoot = getDartRoot(projectRoot, fuseConfig);
  const use = newBundleUse();
  const viteConfig = buildViteConfig(projectRoot, fuseConfig, use);

  console.log("\nBuilding JS bundle...");
  await viteBuild(viteConfig);
  shakeGenerated(projectRoot, fuseConfig, dartRoot, use);

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

/**
 * Rewrites the generated Dart for what the bundle uses: `fuse link` wrote
 * all of it (what `fuse dev` needs), and Dart can't drop registered
 * adapters on its own. `fuse dev` and `fuse gen` write the full file again.
 */
function shakeGenerated(projectRoot: string, fuseConfig: FuseConfig | null, dartRoot: string, use: BundleUse) {
  const manifestPath = join(dartRoot, ".dart_tool", "solid_fuse_gen", "manifest.json");
  const usesPath = resolve(projectRoot, genOutDir(fuseConfig), "uses.json");
  if (!existsSync(manifestPath) || !existsSync(usesPath)) return;
  const full = readManifest(readFileSync(manifestPath, "utf8"));
  const { manifest, handleTags } = shake(full, JSON.parse(readFileSync(usesPath, "utf8")), use);
  writeFileSync(join(dartRoot, GENERATED_DART), emitDart(manifest, { handleTags }).code);
  const consts = (m: typeof full) => Object.values(m.types).reduce((n, t) => n + (t.kind === "data" ? (t.consts?.length ?? 0) : 0), 0);
  console.log(
    `Generated Dart, kept what the bundle uses: ${manifest.widgets.length} of ${full.widgets.length} widgets, ` +
      `${manifest.handles.length} of ${full.handles.length} controllers, ${consts(manifest)} of ${consts(full)} constants.`,
  );
}
