import { spawnSync } from "child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { FuseConfig, FusePlatform } from "../src/config";

export const PLATFORMS: FusePlatform[] = ["android", "ios", "macos", "linux", "windows", "web"];

/** The platform a `flutter build <target>` builds for. */
const BUILD_TARGETS: Record<string, FusePlatform> = {
  apk: "android",
  appbundle: "android",
  aar: "android",
  ios: "ios",
  ipa: "ios",
  "ios-framework": "ios",
  macos: "macos",
  "macos-framework": "macos",
  linux: "linux",
  windows: "windows",
  web: "web",
};

export function buildTargetPlatform(flutterArgs: string[]): FusePlatform | undefined {
  const target = flutterArgs.find((a) => !a.startsWith("-"));
  return target ? BUILD_TARGETS[target] : undefined;
}

/** Every file under `dir`, skipping the platform folders and tool output. */
function snapshot(dir: string, rel = ""): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(join(dir, rel))) {
    const path = rel ? `${rel}/${entry}` : entry;
    if (!rel && ((PLATFORMS as string[]).includes(entry) || ["build", ".dart_tool"].includes(entry))) continue;
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, path);
    if (statSync(full).isDirectory()) {
      for (const [k, v] of snapshot(dir, path)) files.set(k, v);
    } else {
      files.set(path, readFileSync(full, "utf-8"));
    }
  }
  return files;
}

/**
 * Add the platform folders (`android/`, `ios/`...) the app is missing, with
 * `flutter create` for just those, and nothing else it would change: the
 * rest of `dart/` stays as it was. Once a folder exists it is the app's own;
 * commit it, edit it, fuse never touches it again.
 */
export function ensureRunners(dartRoot: string, platforms: FusePlatform[], config: FuseConfig | null) {
  const missing = [...new Set(platforms)].filter((p) => !existsSync(join(dartRoot, p)));
  if (missing.length === 0) return;
  const org = config?.org ?? "com.example";
  console.log(`Adding ${missing.map((p) => `${p}/`).join(", ")} to ${dartRoot} (flutter create, org ${org}).`);

  const before = snapshot(dartRoot);
  // Without it, the name would come from the folder (`dart`).
  const name = before.get("pubspec.yaml")?.match(/^name:\s*(\S+)/m)?.[1];
  const args = ["create", `--platforms=${missing.join(",")}`, "--org", org, ...(name ? ["--project-name", name] : []), "--no-pub", "."];
  const r = spawnSync("flutter", args, { cwd: dartRoot, stdio: ["ignore", "ignore", "inherit"] });
  if (r.error || r.status !== 0) throw new Error(`\`flutter ${args.join(" ")}\` failed in ${dartRoot}.`);

  // Undo the sample app, test and README it writes, and its edits to ours.
  // `.metadata` stays: Flutter's own record of the project, for migrations.
  for (const [path, text] of snapshot(dartRoot)) {
    if (path === ".metadata") continue;
    const old = before.get(path);
    if (old !== undefined) {
      if (old !== text) writeFileSync(join(dartRoot, path), old);
      continue;
    }
    rmSync(join(dartRoot, path));
    // And the folders it made for them (lib/, test/), when nothing else is in them.
    for (let dir = dirname(path); dir !== "."; dir = dirname(dir)) {
      const full = join(dartRoot, dir);
      if (readdirSync(full).length > 0 || [...before.keys()].some((k) => k.startsWith(`${dir}/`))) break;
      rmSync(full, { recursive: true });
    }
  }
}
