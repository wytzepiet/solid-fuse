import { spawnSync } from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { defineCommand } from "citty";
import { detectPackageManager, findProjectRoot, getDartRoot } from "./utils";
import { loadFuseConfig } from "./config";

type Status = "ok" | "warn" | "fail";
interface Check {
  status: Status;
  what: string;
  /** How to fix it, for warn and fail. */
  fix?: string;
}

const MIN_FLUTTER = [3, 50, 0];

function has(cmd: string): boolean {
  return spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status === 0;
}

/** `[3, 50, 1]` ≥ `[3, 50, 0]` */
export function atLeast(version: number[], min: number[]): boolean {
  for (let i = 0; i < min.length; i++) {
    if ((version[i] ?? 0) !== min[i]) return (version[i] ?? 0) > min[i];
  }
  return true;
}

function flutterCheck(): Check {
  const r = spawnSync("flutter", ["--version", "--machine"], { encoding: "utf-8" });
  if (r.error || r.status !== 0) {
    return { status: "fail", what: "Flutter not found", fix: "Install Flutter 3.50+: https://docs.flutter.dev/get-started/install" };
  }
  let version = "?";
  try {
    version = JSON.parse(r.stdout.slice(r.stdout.indexOf("{"))).frameworkVersion;
  } catch {}
  const ok = atLeast(version.split(".").map((n) => parseInt(n, 10)), MIN_FLUTTER);
  return ok
    ? { status: "ok", what: `Flutter ${version}` }
    : { status: "fail", what: `Flutter ${version}: Fuse needs ${MIN_FLUTTER.join(".")} or newer`, fix: "flutter upgrade" };
}

function toolChecks(): Check[] {
  const checks: Check[] = [{ status: "ok", what: process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.versions.node}` }, flutterCheck()];
  // The JS engine (fjs) is a Rust library the first build compiles.
  checks.push(
    has("cargo")
      ? { status: "ok", what: "Rust (cargo), for the first build of the JS engine" }
      : { status: "fail", what: "Rust not found: the first build compiles the JS engine", fix: "Install it: https://rustup.rs" },
  );
  if (process.platform === "linux") {
    const missing = ["clang", "cmake", "ninja", "pkg-config"].filter((c) => !has(c));
    const gtk = has("pkg-config") && spawnSync("pkg-config", ["--exists", "gtk+-3.0"]).status === 0;
    if (!gtk) missing.push("libgtk-3-dev");
    checks.push(
      missing.length === 0
        ? { status: "ok", what: "Linux desktop toolchain" }
        : { status: "warn", what: `Linux desktop toolchain: missing ${missing.join(", ")}`, fix: "apt-get install clang cmake ninja-build pkg-config libgtk-3-dev" },
    );
    const headless = ["Xvfb", "dbus-daemon"].filter((c) => !has(c));
    checks.push(
      headless.length === 0
        ? { status: "ok", what: `\`fuse dev --headless\`${has("gnome-keyring-daemon") ? "" : " (no gnome-keyring: secure storage won't work)"}` }
        : { status: "warn", what: `\`fuse dev --headless\` needs ${headless.join(", ")}`, fix: "apt-get install xvfb dbus gnome-keyring" },
    );
  }
  return checks;
}

async function projectChecks(): Promise<Check[]> {
  let root: string;
  try {
    root = findProjectRoot();
  } catch {
    return [];
  }
  const config = await loadFuseConfig(root);
  const dartRoot = getDartRoot(root, config);
  const checks: Check[] = [];

  const core = join(root, "node_modules", "solid-fuse", "package.json");
  if (!existsSync(core)) {
    checks.push({ status: "fail", what: "Packages not installed", fix: `${detectPackageManager(root)} install` });
    return checks;
  }
  const version = JSON.parse(readFileSync(core, "utf-8")).version;
  checks.push({ status: "ok", what: `solid-fuse ${version}` });

  if (!existsSync(join(dartRoot, "pubspec_overrides.yaml")) || !existsSync(join(dartRoot, "lib", "_generated", "fuse_packages.dart"))) {
    checks.push({ status: "warn", what: "Not linked yet", fix: "fuse link (fuse dev does it too)" });
  }

  const missing = (config?.platforms ?? []).filter((p) => !existsSync(join(dartRoot, p)));
  if (missing.length) {
    checks.push({ status: "ok", what: `No ${missing.map((p) => `${p}/`).join(", ")} yet: fuse dev or fuse build adds it` });
  }

  // Vite keeps a pre-bundled copy of dependencies; one older than the
  // installed solid-fuse serves the old code.
  const prebundle = join(root, "node_modules", ".vite", "deps", "_metadata.json");
  const dist = join(root, "node_modules", "solid-fuse", "dist", "index.js");
  if (existsSync(prebundle) && existsSync(dist) && statSync(prebundle).mtimeMs < statSync(dist).mtimeMs) {
    checks.push({ status: "warn", what: "Vite's pre-bundle is older than solid-fuse", fix: "rm -rf node_modules/.vite" });
  }
  return checks;
}

function print(title: string, checks: Check[]) {
  if (checks.length === 0) return;
  console.log(`\n${title}`);
  const mark = { ok: "✓", warn: "!", fail: "✗" };
  for (const c of checks) {
    console.log(`  ${mark[c.status]} ${c.what}`);
    if (c.fix && c.status !== "ok") console.log(`      ${c.fix}`);
  }
}

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description: "Check the tools a Fuse app needs, and this app's setup. Then runs `flutter doctor` for the platform toolchains.",
  },
  args: {
    flutter: { type: "boolean", default: true, description: "Run `flutter doctor` too (--no-flutter to skip)" },
  },
  run: async ({ args }) => {
    const tools = toolChecks();
    const project = await projectChecks();
    print("Tools", tools);
    print("This app", project);
    const failed = [...tools, ...project].some((c) => c.status === "fail");

    if (args.flutter && tools[0].status !== "fail") {
      console.log("\nPlatform toolchains (flutter doctor):\n");
      spawnSync("flutter", ["doctor"], { stdio: "inherit" });
    }
    process.exit(failed ? 1 : 0);
  },
});
