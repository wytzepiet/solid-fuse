/**
 * `fuse gen`, and the generation step `fuse link` and the Vite plugin
 * (plugin.ts) run when there is a `dart/lib/fuse.dart`.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { defineCommand } from "citty";
import type { FuseConfig } from "../../src/config";
import { runGenerator, writeGenerated } from "./index";
import type { Manifest } from "./manifest";

/** solid_fuse_gen inside this package (`gen/`, next to `cli/`). */
const genPackage = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "gen");

/** Where the generated TypeScript goes, relative to the project root. */
export function genOutDir(config: FuseConfig | null): string {
  return config?.gen?.out ?? "fuse";
}

/**
 * Whether there is anything to generate: the app's `lib/fuse.dart`, or a
 * package's. solid_fuse's counts: it brings the value types core's props
 * take, and their decoders, so an app with no design package needs it too.
 */
export function hasBarrels(dartRoot: string): boolean {
  if (existsSync(join(dartRoot, "lib", "fuse.dart"))) return true;
  const configPath = join(dartRoot, ".dart_tool", "package_config.json");
  if (!existsSync(configPath)) return false;
  const base = pathToFileURL(join(dartRoot, ".dart_tool", "/"));
  const packages = (JSON.parse(readFileSync(configPath, "utf8")).packages ?? []) as { name: string; rootUri: string; packageUri?: string }[];
  return packages.some((p) => {
    const lib = new URL(p.packageUri ?? "lib/", new URL(p.rootUri.endsWith("/") ? p.rootUri : `${p.rootUri}/`, base));
    return existsSync(fileURLToPath(new URL("fuse.dart", lib)));
  });
}

/** The Dart file with the generated adapters, under the app's lib/. */
export const GENERATED_DART = join("lib", "_generated", "fuse.generated.dart");

async function run(cmd: string[], cwd: string): Promise<{ code: number; output: string }> {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [code, out, err] = await Promise.all([p.exited, new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code, output: out + err };
}

export interface GenResult {
  manifest: Manifest;
  written: string[];
  report: string;
}

/**
 * Runs the generator for the app at [projectRoot] and writes the TypeScript
 * modules (`<out>/<package>.tsx`, imported as `#fuse/<package>`), the Dart
 * adapters (lib/_generated/fuse.generated.dart) and a report of what was
 * exported and what was skipped, and why (`<out>/gen-report.txt`).
 */
export async function runGen(projectRoot: string, config: FuseConfig | null, { force = false, resident = false } = {}): Promise<GenResult> {
  const dartRoot = join(projectRoot, config?.dart ?? "dart");
  if (!existsSync(join(genPackage, ".dart_tool", "package_config.json"))) {
    const r = await run(["dart", "pub", "get"], genPackage);
    if (r.code !== 0) throw new Error(`dart pub get in ${genPackage} failed:\n${r.output}`);
  }
  const manifest = await runGenerator({
    dartRoot,
    // What crosses is what the barrels export (lib/fuse.dart).
    libraries: {},
    command: { cmd: ["dart", "run", "solid_fuse_gen"], cwd: genPackage },
    force,
    resident,
  });
  const outDir = join(projectRoot, genOutDir(config));
  const { written } = writeGenerated(manifest, { tsDir: outDir, dartFile: join(dartRoot, GENERATED_DART) });
  const report = reportOf(manifest);
  const reportPath = join(outDir, "gen-report.txt");
  if (!existsSync(reportPath) || readFileSync(reportPath, "utf8") !== report) {
    writeFileSync(reportPath, report);
    written.push(reportPath);
  }
  ensureTsPaths(projectRoot, genOutDir(config));
  return { manifest, written, report };
}

/** Every exported and skipped item, one per line: the "why" log. */
export function reportOf(m: Manifest): string {
  const lines = [
    "# fuse gen report. Generated; do not edit.",
    `# ${m.widgets.length} widgets, ${m.handles.length} handles, ${m.skipped.length} skipped`,
    "",
    "## Widgets",
    ...m.widgets.map((w) => `${w.component}  ${w.id}`),
    "",
    "## Handles (createX)",
    ...m.handles.map((id) => `${m.types[id].name}  ${id}`),
    "",
    "## Skipped",
    ...m.skipped.map((s) => `${s.item}: ${s.reason}`),
    "",
  ];
  return lines.join("\n");
}

/**
 * Lets TypeScript resolve `#fuse/<package>`: adds a `paths` entry to
 * tsconfig.json. Plain JSON is rewritten; a file with comments (JSONC, as
 * most templates write it) gets the entry spliced in, keeping the comments.
 */
function ensureTsPaths(projectRoot: string, out: string) {
  const path = join(projectRoot, "tsconfig.json");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  const next = withFusePaths(text, `./${out.replace(/\\/g, "/")}/*`);
  if (next === null) {
    console.log(`Add to tsconfig.json compilerOptions.paths: "#fuse/*": ["./${out}/*"]`);
  } else if (next !== text) {
    writeFileSync(path, next);
    console.log(`Added "#fuse/*" to ${relative(projectRoot, path)}`);
  }
}

/** [text] with `compilerOptions.paths["#fuse/*"]` set to [target], or null when it can't tell where. */
export function withFusePaths(text: string, target: string): string | null {
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  if (json !== undefined) {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    const have = json.compilerOptions.paths["#fuse/*"];
    if (Array.isArray(have) && have[0] === target) return text;
    json.compilerOptions.paths["#fuse/*"] = [target];
    return `${JSON.stringify(json, null, 2)}\n`;
  }
  // JSONC: splice the entry in as text. Find keys in a copy with the comments
  // blanked (same length, so offsets carry over); strings stay as they are.
  if (text.includes('"#fuse/*"')) return text;
  const code = text.replace(/"(?:[^"\\\n]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m) =>
    m.startsWith('"') ? m : m.replace(/[^\n]/g, " "),
  );
  const key = (name: string, from = 0) => {
    const re = new RegExp(`"${name}"\\s*:\\s*\\{`, "g");
    re.lastIndex = from;
    const m = re.exec(code);
    return m ? m.index + m[0].length : -1;
  };
  const options = key("compilerOptions");
  if (options < 0) return null;
  const entry = `"#fuse/*": ["${target}"]`;
  const paths = key("paths", options);
  if (paths >= 0) return `${text.slice(0, paths)} ${entry},${text.slice(paths)}`;
  return `${text.slice(0, options)}\n    "paths": { ${entry} },${text.slice(options)}`;
}

export const genCommand = defineCommand({
  meta: {
    name: "gen",
    description: "Generate TypeScript components and Dart adapters from Dart (fuse.config.ts `gen`, and @fuse classes)",
  },
  args: {
    force: { type: "boolean", description: "Generate even when nothing changed", default: false },
  },
  run: async ({ args }) => {
    const { findProjectRoot } = await import("../utils");
    const { loadFuseConfig } = await import("../config");
    const { runLink } = await import("../link");
    const root = findProjectRoot();
    const config = await loadFuseConfig(root);
    const t0 = performance.now();
    const r = await runGen(root, config, { force: args.force });
    console.log(
      `fuse gen: ${r.manifest.widgets.length} widgets, ${r.manifest.handles.length} handles, ${r.manifest.skipped.length} skipped ` +
        `(${Math.round(performance.now() - t0)} ms); ${r.written.length} files written. Details: ${join(genOutDir(config), "gen-report.txt")}`,
    );
    // Registers the adapters (lib/_generated/fuse_packages.dart).
    await runLink(root, { pubGet: false, gen: false });
  },
});
