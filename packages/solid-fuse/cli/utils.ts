import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

/**
 * Walk up from `cwd` looking for a directory that contains both
 * `pubspec.yaml` and `package.json`.
 */
export function findProjectRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  const root = dirname(dir) === dir ? dir : "/";

  while (true) {
    if (
      existsSync(join(dir, "pubspec.yaml")) &&
      existsSync(join(dir, "package.json"))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "Could not find project root (directory with both pubspec.yaml and package.json)"
      );
    }
    dir = parent;
  }
}

export interface FusePackageInfo {
  /** npm package name */
  npmName: string;
  /** Dart package name from dart/pubspec.yaml */
  dartName: string;
  /** Absolute path to the package in node_modules */
  path: string;
  /** Path to the dart directory (relative to package root) */
  dartPath: string;
  /** Class name to call .register() on */
  registerClass: string;
}

/**
 * Scan node_modules for packages with a `"fuse"` field in package.json.
 */
export function scanFusePackages(projectRoot: string): FusePackageInfo[] {
  const nodeModules = join(projectRoot, "node_modules");
  if (!existsSync(nodeModules)) return [];

  const packages: FusePackageInfo[] = [];

  // Scan top-level packages
  scanDir(nodeModules, packages);

  // Scan scoped packages (@org/*)
  const entries = readdirSafe(nodeModules);
  for (const entry of entries) {
    if (entry.startsWith("@")) {
      scanDir(join(nodeModules, entry), packages);
    }
  }

  // Sort: solid-fuse first, then alphabetically
  packages.sort((a, b) => {
    if (a.npmName === "solid-fuse") return -1;
    if (b.npmName === "solid-fuse") return 1;
    return a.npmName.localeCompare(b.npmName);
  });

  return packages;
}

function scanDir(dir: string, results: FusePackageInfo[]) {
  const entries = readdirSafe(dir);
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const pkgJsonPath = join(dir, entry, "package.json");
    if (!existsSync(pkgJsonPath)) continue;

    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      const fuse = pkgJson.fuse;
      if (!fuse || !fuse.register) continue;

      const dartPath = fuse.dart ?? "dart";
      const pubspecPath = join(dir, entry, dartPath, "pubspec.yaml");
      if (!existsSync(pubspecPath)) {
        console.warn(
          `[fuse] ${pkgJson.name}: fuse.register set but no pubspec.yaml at ${dartPath}/`
        );
        continue;
      }

      const dartName = readPubspecName(pubspecPath);
      if (!dartName) {
        console.warn(
          `[fuse] ${pkgJson.name}: could not read name from ${pubspecPath}`
        );
        continue;
      }

      results.push({
        npmName: pkgJson.name,
        dartName,
        path: join(dir, entry),
        dartPath,
        registerClass: fuse.register,
      });
    } catch {
      // skip malformed packages
    }
  }
}

/**
 * Read the `name:` field from a pubspec.yaml using simple regex.
 */
export function readPubspecName(pubspecPath: string): string | null {
  const content = readFileSync(pubspecPath, "utf-8");
  const match = content.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}


/**
 * Check that a Dart package name appears under `dependencies:` in a pubspec.yaml.
 */
export function pubspecHasDependency(
  pubspecPath: string,
  dartName: string
): boolean {
  const content = readFileSync(pubspecPath, "utf-8");
  // Extract the dependencies: section (up to the next top-level key or EOF)
  const section = content.match(/^dependencies:\s*\n([\s\S]*?)(?=^\S)/m);
  if (!section) return false;
  return new RegExp(`^\\s+${dartName}:`, "m").test(section[1]);
}

/**
 * Add `dartName: any` under the `dependencies:` section of a pubspec.yaml.
 */
export function pubspecAddDependency(
  pubspecPath: string,
  dartName: string
): void {
  const content = readFileSync(pubspecPath, "utf-8");
  const entry = `  ${dartName}: any # fuse-managed`;

  const match = content.match(/^dependencies:\s*$/m);
  if (match) {
    const eol = content.indexOf("\n", match.index!);
    const updated = content.slice(0, eol + 1) + entry + "\n" + content.slice(eol + 1);
    writeFileSync(pubspecPath, updated);
  } else {
    writeFileSync(pubspecPath, content.trimEnd() + "\n\ndependencies:\n" + entry + "\n");
  }
}

function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// LAN IP detection
// ---------------------------------------------------------------------------

/**
 * Auto-detect the LAN IP address for device connectivity.
 * Tries macOS `ipconfig getifaddr` on common interfaces, falls back to "localhost".
 */
export function detectLanIp(): string {
  const { execSync } = require("child_process") as typeof import("child_process");
  for (const iface of ["en0", "en1"]) {
    try {
      const ip = execSync(`ipconfig getifaddr ${iface}`, { encoding: "utf-8" }).trim();
      if (ip) return ip;
    } catch {
      // interface not available
    }
  }
  return "localhost";
}

// ---------------------------------------------------------------------------
// Package manager detection
// ---------------------------------------------------------------------------

export type PackageManager = "bun" | "yarn" | "pnpm" | "npm";

/**
 * Detect which package manager the project uses based on lock files.
 */
export function detectPackageManager(projectRoot: string): PackageManager {
  if (existsSync(join(projectRoot, "bun.lock")) || existsSync(join(projectRoot, "bun.lockb"))) return "bun";
  if (existsSync(join(projectRoot, "yarn.lock"))) return "yarn";
  if (existsSync(join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  return "npm";
}

/** Returns the command and prefix args for running a local binary (e.g. vite) via the package manager. */
export function pmExec(pm: PackageManager): { cmd: string; args: string[] } {
  switch (pm) {
    case "bun": return { cmd: "bunx", args: [] };
    case "npm": return { cmd: "npx", args: [] };
    case "yarn": return { cmd: "yarn", args: [] };
    case "pnpm": return { cmd: "pnpm", args: ["exec"] };
  }
}


// ---------------------------------------------------------------------------
// Pubspec dependency removal
// ---------------------------------------------------------------------------

/**
 * Remove a `# fuse-managed` dependency from a pubspec.yaml.
 */
export function pubspecRemoveDependency(
  pubspecPath: string,
  dartName: string
): void {
  const content = readFileSync(pubspecPath, "utf-8");
  const pattern = new RegExp(`^\\s+${dartName}:.*#\\s*fuse-managed\\s*$\\n?`, "m");
  const updated = content.replace(pattern, "");
  if (updated !== content) {
    writeFileSync(pubspecPath, updated);
  }
}

/**
 * Get all `# fuse-managed` dependency names from a pubspec.yaml.
 */
export function pubspecGetManagedDependencies(pubspecPath: string): string[] {
  const content = readFileSync(pubspecPath, "utf-8");
  const results: string[] = [];
  const pattern = /^\s+(\S+):.*#\s*fuse-managed\s*$/gm;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    results.push(match[1]);
  }
  return results;
}
