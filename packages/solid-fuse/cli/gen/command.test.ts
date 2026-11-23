import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { buildViteConfig } from "../config";
import { reportOf, withFusePaths } from "./command";
import type { Manifest } from "./manifest";

test("the report lists what was exported and why the rest was not", () => {
  const m = {
    widgets: [{ id: "package:a/a.dart#Box", component: "Box" }],
    handles: ["package:a/a.dart#Ctl"],
    types: { "package:a/a.dart#Ctl": { kind: "handle", name: "Ctl" } },
    skipped: [{ item: "package:a/a.dart#List.builder", reason: "generic callback" }],
  } as unknown as Manifest;
  const r = reportOf(m);
  expect(r).toContain("Box  package:a/a.dart#Box");
  expect(r).toContain("Ctl  package:a/a.dart#Ctl");
  expect(r).toContain("package:a/a.dart#List.builder: generic callback");
});

test("vite resolves #fuse/<package> and the compile step knows the generated tables", () => {
  const root = mkdtempSync(join(tmpdir(), "fuse-gen-"));
  mkdirSync(join(root, "fuse"));
  writeFileSync(
    join(root, "fuse", "intrinsics.json"),
    JSON.stringify({ intrinsics: { flutter: { Padding: "flutter_Padding" } }, builders: { flutter: { "EdgeInsets.all": { tag: "EdgeInsets.all", positional: ["value"] } } } }),
  );
  const config = buildViteConfig(root, { gen: {} });
  const alias = (config.resolve!.alias as { find: RegExp; replacement: string }[])[0];
  expect("#fuse/flutter".replace(alias.find, alias.replacement)).toBe(join(root, "fuse", "flutter.tsx"));
  const plugin = (config.plugins as any[]).flat().find((p) => p?.name === "solid-fuse:compile");
  const out = plugin.transform(`import { Padding, EdgeInsets } from "#fuse/flutter";\nexport const x = <Padding padding={EdgeInsets.all(8)} />;\n`, "/a.tsx");
  // Compiled as its element, with the builder folded into the template.
  expect(out.code).toContain("flutter_Padding");
  expect(out.code).toContain('"EdgeInsets.all"');
});

test("withFusePaths splices #fuse/* into a tsconfig with comments", () => {
  const jsonc = `{\n  "compilerOptions": {\n    // "paths": {}\n    "strict": true, /* trailing */\n  }\n}\n`;
  const out = withFusePaths(jsonc, "./fuse/*")!;
  expect(out).toContain(`"paths": { "#fuse/*": ["./fuse/*"] },`);
  expect(out).toContain(`// "paths": {}`);
  expect(withFusePaths(out, "./fuse/*")).toBe(out);
  const withPaths = `{ // app\n  "compilerOptions": { "paths": { "~/*": ["./src/*"] }, }\n}`;
  expect(withFusePaths(withPaths, "./fuse/*")).toContain(`"paths": { "#fuse/*": ["./fuse/*"], "~/*"`);
  expect(withFusePaths(`{ "compilerOptions": {} }`, "./fuse/*")).toBe(`{\n  "compilerOptions": {\n    "paths": {\n      "#fuse/*": [\n        "./fuse/*"\n      ]\n    }\n  }\n}\n`);
});
