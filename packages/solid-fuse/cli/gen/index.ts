/**
 * `fuse gen`: run solid_fuse_gen (Dart, reads the signatures) and turn its
 * manifest into TypeScript modules and Dart adapters.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { emitDart } from "./emit-dart";
import { emitTs, type TsOutput } from "./emit-ts";
import { readManifest, type Manifest } from "./manifest";

export { emitDart, tagOf } from "./emit-dart";
export { emitTs } from "./emit-ts";
export type { Manifest } from "./manifest";

export interface GenLibraries {
  [libraryUri: string]: { allow?: string[]; deny?: string[] };
}

export interface RunGeneratorOptions {
  /** The Flutter package to analyze. */
  dartRoot: string;
  libraries: GenLibraries;
  /** Where the manifest goes. Default `<dartRoot>/.dart_tool/solid_fuse_gen/manifest.json`. */
  manifestPath?: string;
  /**
   * Command that runs the generator; `--config/--out/--root` are appended.
   * Default: `dart run solid_fuse_gen` in [dartRoot] (the app depends on it).
   */
  command?: { cmd: string[]; cwd: string };
  force?: boolean;
}

/** Runs solid_fuse_gen and reads its manifest. */
export async function runGenerator(o: RunGeneratorOptions): Promise<Manifest> {
  const tool = join(o.dartRoot, ".dart_tool", "solid_fuse_gen");
  mkdirSync(tool, { recursive: true });
  const configPath = join(tool, "config.json");
  const manifestPath = o.manifestPath ?? join(tool, "manifest.json");
  // Stable key order: the config's text is part of the input hash.
  const sorted = Object.fromEntries(Object.entries(o.libraries).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(configPath, JSON.stringify({ libraries: sorted }, null, 1));
  const command = o.command ?? { cmd: ["dart", "run", "solid_fuse_gen"], cwd: o.dartRoot };
  const proc = Bun.spawn(
    [...command.cmd, "--root", o.dartRoot, "--config", configPath, "--out", manifestPath, ...(o.force ? ["--force"] : [])],
    { cwd: command.cwd, stdout: "pipe", stderr: "pipe" },
  );
  const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
  if (code !== 0) throw new Error(`solid_fuse_gen exited with ${code}:\n${stderr}`);
  return readManifest(readFileSync(manifestPath, "utf8"));
}

export interface WriteOptions {
  /** Directory for the `.tsx` modules (one per package). */
  tsDir: string;
  /** The Dart file with the adapters. */
  dartFile: string;
}

/** Writes the emitted files; a file whose content is unchanged is not touched. */
export function writeGenerated(m: Manifest, o: WriteOptions): { ts: TsOutput; written: string[] } {
  const ts = emitTs(m);
  const dart = emitDart(m);
  const written: string[] = [];
  const put = (path: string, code: string) => {
    if (existsSync(path) && readFileSync(path, "utf8") === code) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, code);
    written.push(path);
  };
  for (const module of ts.modules) put(join(o.tsDir, `${module.name}.tsx`), module.code);
  put(join(o.tsDir, "intrinsics.json"), `${JSON.stringify({ intrinsics: ts.intrinsics, builders: ts.builders }, null, 1)}\n`);
  put(o.dartFile, dart.code);
  return { ts, written };
}
