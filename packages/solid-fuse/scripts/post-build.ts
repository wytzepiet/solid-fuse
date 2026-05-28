import { cpSync, readFileSync, writeFileSync } from "fs";

// Copy ambient type declarations to dist
cpSync("src/jsx.d.ts", "dist/jsx.d.ts");
cpSync("src/global.d.ts", "dist/global.d.ts");

// Prepend reference directive so consumers get JSX types automatically
const dts = readFileSync("dist/index.d.ts", "utf-8");
writeFileSync("dist/index.d.ts", `/// <reference path="./jsx.d.ts" />\n/// <reference path="./global.d.ts" />\n${dts}`);

// Ship docs alongside the package so consumer-app agents can read them via
// node_modules/solid-fuse/dist/docs/. Source of truth is packages/docs/.
cpSync("../docs/content/docs", "dist/docs", { recursive: true });
