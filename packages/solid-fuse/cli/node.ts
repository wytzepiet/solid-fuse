/**
 * The few things the CLI needs from its runtime, on plain Node. The CLI ships
 * as JavaScript (dist/cli/, built by vite.cli.config.ts) so apps don't need
 * Bun: they can use npm, pnpm, yarn or bun.
 */
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

/**
 * This package's root (where its package.json is), from source (cli/) or
 * from the build (dist/cli/).
 */
export const packageRoot: string = (() => {
  for (let dir = import.meta.dirname; ; dir = dirname(dir)) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf-8")).name === "solid-fuse") return dir;
    if (dirname(dir) === dir) throw new Error(`solid-fuse's package.json not found above ${import.meta.dirname}`);
  }
})();

/** Runs [cmd] to its end and collects its output. */
export function capture(cmd: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd[0], cmd.slice(1), { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    p.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    p.on("error", (e) => resolve({ code: 127, stdout, stderr: stderr + String(e) }));
    p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
