import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { networkInterfaces } from "os";
import { dirname, join, resolve } from "path";
import { loadFuseConfig, CONFIG_FILES, fuseDependencies } from "./config";
import type { FuseConfig } from "../src/config";

/**
 * Walk up from `cwd` looking for a directory that contains
 * `package.json` and a `fuse.config.{ts,mjs,js}`.
 */
export function findProjectRoot(from: string = process.cwd()): string {
  let dir = resolve(from);

  while (true) {
    if (
      existsSync(join(dir, "package.json")) &&
      CONFIG_FILES.some((f) => existsSync(join(dir, f)))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "Could not find project root (directory with both package.json and fuse.config.ts)"
      );
    }
    dir = parent;
  }
}

/**
 * Resolve the Dart/Flutter project root from the project root and fuse config.
 */
export function getDartRoot(projectRoot: string, fuseConfig: FuseConfig | null): string {
  return join(projectRoot, fuseConfig?.dart ?? "dart");
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
  /** The Dart function that registers its hand-written pieces; none when
   *  all its Dart is generated (only a `lib/fuse.dart`). */
  registerClass?: string;
}

/**
 * The fuse packages the app depends on (`fuseDependencies`), with their Dart.
 */
export async function scanFusePackages(projectRoot: string): Promise<FusePackageInfo[]> {
  const packages: FusePackageInfo[] = [];
  for (const { dir } of fuseDependencies(projectRoot)) await scanPackage(dir, packages);

  // Sort: solid-fuse first, then alphabetically
  packages.sort((a, b) => {
    if (a.npmName === "solid-fuse") return -1;
    if (b.npmName === "solid-fuse") return 1;
    return a.npmName.localeCompare(b.npmName);
  });

  return packages;
}

async function scanPackage(pkgDir: string, results: FusePackageInfo[]) {
  {
    const pkgJsonPath = join(pkgDir, "package.json");
    try {
      const config = await loadFuseConfig(pkgDir);
      if (!config) return;

      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      const dartPath = config.dart ?? "dart";
      const pubspecPath = join(pkgDir, dartPath, "pubspec.yaml");
      if (!existsSync(pubspecPath)) {
        // A JS-only package (components over other packages' widgets).
        if (config.register === undefined && config.dart === undefined) return;
        console.warn(
          `[fuse] ${pkgJson.name}: fuse.config register set but no pubspec.yaml at ${dartPath}/`
        );
        return;
      }

      const dartName = readPubspecName(pubspecPath);
      if (!dartName) {
        console.warn(
          `[fuse] ${pkgJson.name}: could not read name from ${pubspecPath}`
        );
        return;
      }

      results.push({
        npmName: pkgJson.name,
        dartName,
        path: pkgDir,
        dartPath,
        registerClass: config.register,
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
 * The direct dependencies a pubspec.yaml names under `dependencies:`, SDK
 * ones (`flutter: sdk: flutter`) aside.
 */
export function pubspecDependencies(pubspecPath: string): string[] {
  const content = readFileSync(pubspecPath, "utf-8");
  const section = content.match(/^dependencies:[^\n]*\n([\s\S]*?)(?=^\S|(?![\s\S]))/m)?.[1] ?? "";
  const names: string[] = [];
  const lines = section.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/^ {2}([a-z0-9_]+):/);
    if (m && !/^ {4}sdk:/.test(lines[i + 1] ?? "")) names.push(m[1]);
  });
  return names;
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

// ---------------------------------------------------------------------------
// LAN IP detection
// ---------------------------------------------------------------------------

/**
 * The LAN address a phone on the same network reaches the dev server at:
 * the first external IPv4 address, else "localhost".
 */
export function detectLanIp(): string {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) return a.address;
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
