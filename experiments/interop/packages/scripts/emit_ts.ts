// Manifest -> TS wrapper module, with the same emitter `fuse gen` uses (cli/gen-emit.ts, copied unchanged).
//   bun scripts/emit_ts.ts            -> ts/generated/<unit>.ts for every manifests/*.manifest.json
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { emitTsModule, type Manifest } from "../cli/gen-emit";

const root = join(import.meta.dir, "..");
mkdirSync(join(root, "ts/generated"), { recursive: true });
const sizes: Record<string, unknown> = {};
for (const f of readdirSync(join(root, "manifests")).filter((f) => f.endsWith(".manifest.json")).sort()) {
  const m = JSON.parse(readFileSync(join(root, "manifests", f), "utf-8")) as Manifest;
  const { ts, perWidgetBytes, sharedBytes } = emitTsModule(m);
  writeFileSync(join(root, "ts/generated", `${m.unit}.ts`), ts);
  sizes[m.unit] = { tsBytes: ts.length, tsLines: ts.split("\n").length, sharedBytes, widgets: Object.keys(perWidgetBytes).length };
}
writeFileSync(join(root, "out/ts-sizes.json"), JSON.stringify(sizes, null, 1));
console.log(`emitted ${Object.keys(sizes).length} modules`);
