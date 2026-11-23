/**
 * `fuse gen` as part of Vite: generates when the build or the dev server
 * starts, regenerates in dev when the Dart changes, and in a build rewrites
 * the Dart adapters for what the bundle uses (shake.ts).
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import type { Plugin } from "vite";
import type { FuseConfig } from "../../src/config";
import type { CompileTables } from "../compile-plugin";
import { GENERATED_DART, hasBarrels, runGen } from "./command";
import { emitDart } from "./emit-dart";
import { closeGenerators } from "./index";
import { readManifest } from "./manifest";
import { newBundleUse, shake, type BundleUse } from "./shake";

export interface FuseGenPluginOptions {
  projectRoot: string;
  dartRoot: string;
  /** Where the generated TypeScript goes. */
  genDir: string;
  config: FuseConfig | null;
  /** Filled in by a build with what the bundle uses (tests read it). */
  use?: BundleUse;
}

/** The compile step's tables for the generated modules, re-read when `fuse gen` writes them. */
export function generatedTables(genDir: string): () => CompileTables {
  let cached: { mtime: number; tables: CompileTables } | null = null;
  return () => {
    const path = join(genDir, "intrinsics.json");
    if (!existsSync(path)) return {};
    const mtime = statSync(path).mtimeMs;
    if (cached?.mtime !== mtime) {
      const t = JSON.parse(readFileSync(path, "utf8")) as Required<CompileTables>;
      const prefixed = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`#fuse/${k}`, v]));
      cached = { mtime, tables: { intrinsics: prefixed(t.intrinsics), builders: prefixed(t.builders) } };
    }
    return cached.tables;
  };
}

export function fuseGenPlugin(o: FuseGenPluginOptions): Plugin & { api: { use: BundleUse } } {
  const use = o.use ?? newBundleUse();
  use.generated = `${o.genDir}/`;
  let building = false;

  async function generate(why: string) {
    if (!hasBarrels(o.dartRoot)) return;
    const t0 = performance.now();
    try {
      // The dev server keeps the generator running: a run after an edit
      // then re-reads only what changed.
      const r = await runGen(o.projectRoot, o.config, { resident: !building });
      const dart = r.written.some((f) => f.endsWith(".dart"));
      if (r.written.length > 0) {
        console.log(
          `fuse gen (${why}): ${r.manifest.widgets.length} widgets, ${r.manifest.handles.length} controllers ` +
            `(${Math.round(performance.now() - t0)} ms)${dart && !building ? ". The Dart adapters changed: restart the app." : ""}`,
        );
      }
    } catch (err) {
      // The previous output stays; the app still runs with it.
      console.error(`fuse gen failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Dart files `fuse gen` reads: the app's lib/, not what it or `fuse link` writes. */
  const isInput = (file: string) => {
    const rel = relative(join(o.dartRoot, "lib"), file);
    return file.endsWith(".dart") && !rel.startsWith("..") && !rel.split(/[\\/]/).includes("_generated");
  };

  return {
    name: "solid-fuse:gen",
    api: { use },
    // Before the compile step reads the tables.
    enforce: "pre",
    configResolved(config) {
      building = config.command === "build";
    },
    async buildStart() {
      // The dev server starts in configureServer.
      if (building) await generate("build");
    },
    async configureServer(server) {
      server.httpServer?.once("close", closeGenerators);
      const close = server.close.bind(server);
      server.close = async () => {
        closeGenerators();
        await close();
      };
      await generate("start");
      server.watcher.add(join(o.dartRoot, "lib"));
      let timer: ReturnType<typeof setTimeout> | null = null;
      const changed = (file: string) => {
        if (!isInput(file)) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void generate("Dart changed"), 100);
      };
      server.watcher.on("change", changed);
      server.watcher.on("add", changed);
      server.watcher.on("unlink", changed);
    },
    generateBundle(_options, bundle) {
      if (!building) return;
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        for (const [id, info] of Object.entries(chunk.modules)) {
          const rel = relative(o.genDir, id.split("?", 1)[0]).replace(/\\/g, "/");
          if (rel.startsWith("..") || !rel.endsWith(".tsx")) continue;
          const name = rel.slice(0, -4);
          let set = use.exports.get(name);
          if (!set) use.exports.set(name, (set = new Set()));
          for (const e of info.renderedExports) set.add(e);
        }
      }
    },
    writeBundle() {
      if (!building) return;
      // Dart can't drop registered adapters on its own: write them again for
      // what the bundle uses. `fuse dev` and `fuse gen` write all of them.
      const manifestPath = join(o.dartRoot, ".dart_tool", "solid_fuse_gen", "manifest.json");
      const usesPath = join(o.genDir, "uses.json");
      if (!existsSync(manifestPath) || !existsSync(usesPath)) return;
      const full = readManifest(readFileSync(manifestPath, "utf8"));
      const { manifest, handleTags } = shake(full, JSON.parse(readFileSync(usesPath, "utf8")), use);
      writeFileSync(join(o.dartRoot, GENERATED_DART), emitDart(manifest, { handleTags }).code);
      const consts = (m: typeof full) => Object.values(m.types).reduce((n, t) => n + (t.kind === "data" ? (t.consts?.length ?? 0) : 0), 0);
      console.log(
        `Generated Dart, kept what the bundle uses: ${manifest.widgets.length} of ${full.widgets.length} widgets, ` +
          `${manifest.handles.length} of ${full.handles.length} controllers, ${consts(manifest)} of ${consts(full)} constants.`,
      );
    },
  };
}
