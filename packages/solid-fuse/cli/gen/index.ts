/**
 * `fuse gen`: run solid_fuse_gen (Dart, reads the signatures) and turn its
 * manifest into TypeScript modules and Dart adapters.
 */
import { mkdirSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { emitDart } from "./emit-dart";
import { emitTs, GENERATED_HEADER, type TsOutput } from "./emit-ts";
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
  /**
   * Keep the generator running between runs (`fuse dev`): the analyzer keeps
   * what it resolved, so a run after an edit takes milliseconds, not
   * seconds. Stop it with [closeGenerators].
   */
  resident?: boolean;
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
  const args = [...command.cmd, "--root", o.dartRoot, "--config", configPath, "--out", manifestPath];
  if (o.resident) {
    await residentRun(args, command.cwd, !!o.force);
  } else {
    const proc = Bun.spawn([...args, ...(o.force ? ["--force"] : [])], { cwd: command.cwd, stdout: "pipe", stderr: "pipe" });
    const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
    if (code !== 0) throw new Error(`solid_fuse_gen exited with ${code}:\n${stderr}`);
  }
  return readManifest(readFileSync(manifestPath, "utf8"));
}

/** Generators kept running (`--serve`), by their command line. */
const resident = new Map<string, Resident>();

interface Resident {
  send(force: boolean): Promise<{ code: number; message: string }>;
  close(): void;
}

async function residentRun(args: string[], cwd: string, force: boolean): Promise<void> {
  const key = JSON.stringify([cwd, ...args]);
  for (let attempt = 0; ; attempt++) {
    let r = resident.get(key);
    if (!r) resident.set(key, (r = serve(args, cwd, () => resident.delete(key))));
    const res = await r.send(force);
    // 75: the generator's own code changed; start it again.
    if (res.code === 75 && attempt === 0) continue;
    if (res.code !== 0) throw new Error(`solid_fuse_gen exited with ${res.code}:\n${res.message}`);
    return;
  }
}

/** Starts `<args> --serve`: one JSON line per run each way. */
function serve(args: string[], cwd: string, gone: () => void): Resident {
  const proc = Bun.spawn([...args, "--serve"], { cwd, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const waiting: ((r: { code: number; message: string }) => void)[] = [];
  let stderr = "";
  let done = false;
  const finish = (code: number) => {
    if (done) return;
    done = true;
    gone();
    for (const w of waiting.splice(0)) w({ code: code || 70, message: stderr.slice(-4000) || "solid_fuse_gen stopped" });
  };
  void (async () => {
    const dec = new TextDecoder();
    for await (const chunk of proc.stderr) stderr = (stderr + dec.decode(chunk, { stream: true })).slice(-16000);
  })();
  void (async () => {
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of proc.stdout) {
      buf += dec.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        // `dart run` may print its own lines first.
        if (!line.startsWith("{")) continue;
        waiting.shift()?.(JSON.parse(line));
      }
    }
  })();
  void proc.exited.then(finish);
  return {
    send(force) {
      if (done) return Promise.resolve({ code: 70, message: stderr.slice(-4000) || "solid_fuse_gen stopped" });
      return new Promise((resolve) => {
        waiting.push(resolve);
        proc.stdin.write(`${JSON.stringify({ force })}\n`);
        proc.stdin.flush();
      });
    },
    close() {
      if (done) return;
      // It exits when its stdin closes.
      proc.stdin.end();
      finish(0);
    },
  };
}

/** Stops every generator [runGenerator] kept running. */
export function closeGenerators(): void {
  for (const r of [...resident.values()]) r.close();
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
  // Modules that are gone (a package or an owner no longer exported). Only
  // files this generator wrote: they start with its header.
  const keep = new Set(ts.modules.map((x) => `${x.name}.tsx`));
  const stale = (rel: string) => {
    const path = join(o.tsDir, rel);
    if (rel.endsWith(".tsx") && !keep.has(rel) && readFileSync(path, "utf8").startsWith(GENERATED_HEADER)) unlinkSync(path);
  };
  if (existsSync(o.tsDir)) {
    for (const f of readdirSync(o.tsDir)) {
      const path = join(o.tsDir, f);
      if (!statSync(path).isDirectory()) {
        stale(f);
        continue;
      }
      for (const g of readdirSync(path)) stale(`${f}/${g}`);
      if (readdirSync(path).length === 0) rmdirSync(path);
    }
  }
  put(join(o.tsDir, "intrinsics.json"), `${JSON.stringify({ intrinsics: ts.intrinsics, builders: ts.builders }, null, 1)}\n`);
  // For `fuse build`: what each generated export stands for (cli/gen/shake.ts).
  put(join(o.tsDir, "uses.json"), `${JSON.stringify(ts.uses)}\n`);
  put(o.dartFile, dart.code);
  return { ts, written };
}
