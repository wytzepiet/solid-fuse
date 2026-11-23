import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { defineCommand } from "citty";
import { findProjectRoot, getDartRoot } from "./utils";
import { loadFuseConfig } from "./config";

// `fuse dev` writes where the running app's VM service is; `fuse drive`
// reads it. Under .dart_tool, so it is never committed.
const sessionFile = (dartRoot: string) => join(dartRoot, ".dart_tool", "fuse", "drive.json");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export function writeDriveSession(dartRoot: string, uri: string) {
  const file = sessionFile(dartRoot);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ uri, pid: process.pid }) + "\n");
}

export function clearDriveSession(dartRoot: string) {
  rmSync(sessionFile(dartRoot), { force: true });
}

/** `http://127.0.0.1:1234/abc=/` → `ws://127.0.0.1:1234/abc=/ws` */
export function vmServiceUri(line: string): string | null {
  const m = line.match(/Dart VM Service on .* is available at: (http:\/\/\S+)/);
  if (!m) return null;
  const http = m[1].endsWith("/") ? m[1] : `${m[1]}/`;
  return `${http.replace(/^http/, "ws")}ws`;
}

// The Dart SDK inside Flutter's, called directly: `flutter/bin/dart` adds a
// wrapper (and a warning when run as root) to every call.
function dartExecutable(): string {
  const flutter = spawnSync("sh", ["-c", "command -v flutter"], { encoding: "utf-8" }).stdout.trim();
  if (!flutter) fail("`fuse drive` needs Flutter on the PATH.");
  const sdkDart = join(dirname(realpathSync(flutter)), "cache", "dart-sdk", "bin", "dart");
  return existsSync(sdkDart) ? sdkDart : join(dirname(flutter), "dart");
}

// The marionette_flutter version the app resolved: the CLI must speak the
// same protocol.
function appMarionetteVersion(dartRoot: string): string | null {
  const lock = join(dartRoot, "pubspec.lock");
  if (!existsSync(lock)) return null;
  const m = readFileSync(lock, "utf-8").match(/\n {2}marionette_flutter:\n(?: {4}.*\n)*? {4}version: "([^"]+)"/);
  return m?.[1] ?? null;
}

function ensureCli(dart: string, version: string | null) {
  const list = spawnSync(dart, ["pub", "global", "list"], { encoding: "utf-8" }).stdout ?? "";
  const active = list.match(/^marionette_cli (\S+)/m)?.[1];
  if (active && (!version || active === version)) return;
  console.error(`Installing marionette_cli ${version ?? ""}...`);
  const r = spawnSync(dart, ["pub", "global", "activate", "marionette_cli", ...(version ? [version] : [])], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (r.status !== 0) fail("Could not install marionette_cli (dart pub global activate).");
}

export const driveCommand = defineCommand({
  meta: {
    name: "drive",
    description:
      "Drive the app `fuse dev` is running: tap, type, scroll, screenshot, logs (Marionette). `fuse drive help-ai` lists every command.",
  },
  run: async ({ rawArgs }) => {
    const projectRoot = findProjectRoot();
    const dartRoot = getDartRoot(projectRoot, await loadFuseConfig(projectRoot));
    const dart = dartExecutable();
    ensureCli(dart, appMarionetteVersion(dartRoot));

    // Commands about the CLI itself, and the MCP server (it connects when
    // the agent asks), need no running app.
    const offline = rawArgs.length === 0 || ["help", "help-ai", "mcp", "--help", "-h"].includes(rawArgs[0]);
    const args = [...rawArgs];
    if (!offline && !args.includes("--uri") && !args.includes("-i") && !args.includes("--instance")) {
      const file = sessionFile(dartRoot);
      if (!existsSync(file)) {
        fail("No running app. Start it with `fuse dev` (on a machine with no screen: `fuse dev --headless`).");
      }
      const { uri } = JSON.parse(readFileSync(file, "utf-8")) as { uri: string };
      args.unshift("--uri", uri);
    }
    const r = spawnSync(dart, ["pub", "global", "run", "marionette_cli:marionette", ...args], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  },
});
