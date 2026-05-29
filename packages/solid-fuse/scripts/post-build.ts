import { cpSync, existsSync, readFileSync, writeFileSync } from "fs";

// Copy ambient type declarations to dist
cpSync("src/jsx.d.ts", "dist/jsx.d.ts");
cpSync("src/global.d.ts", "dist/global.d.ts");

// Prepend reference directive so consumers get JSX types automatically
const dts = readFileSync("dist/index.d.ts", "utf-8");
writeFileSync("dist/index.d.ts", `/// <reference path="./jsx.d.ts" />\n/// <reference path="./global.d.ts" />\n${dts}`);

// Ship docs alongside the package so consumer-app agents can read them via
// node_modules/solid-fuse/dist/docs/. Source of truth is packages/docs/.
cpSync("../docs/content/docs", "dist/docs", { recursive: true });

// Also ship the vendored SolidJS 2.0 docs (refreshed by `bun run sync-solid-docs`).
// Skipped on a fresh clone that hasn't synced yet, so the build stays self-contained.
if (existsSync("vendor/solid-2.0-docs")) {
  cpSync("vendor/solid-2.0-docs", "dist/docs/solid-2.0", { recursive: true });
} else {
  console.warn("⚠ vendor/solid-2.0-docs missing — run `bun run sync-solid-docs` to bundle Solid 2.0 docs");
}
