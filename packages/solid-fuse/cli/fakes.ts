/**
 * Fakes: the app's `src/fakes.ts` stands in for native capabilities (`fake()`
 * in src/fake.ts). It runs before the app where fakes are on, and is never
 * part of the bundle where they are off, so a phone build has neither the
 * fakes nor their Dart side (the build keeps only what the bundle uses).
 */
import { existsSync } from "fs";
import { join, resolve } from "path";
import type { Plugin } from "vite";

const FILES = ["src/fakes.ts", "src/fakes.tsx"];

/** The app's fakes file, if it has one. */
export function fakesFile(projectRoot: string): string | null {
  for (const f of FILES) {
    const path = join(projectRoot, f);
    if (existsSync(path)) return path;
  }
  return null;
}

/** Targets that are phones: fakes never go in their builds. */
const PHONE = new Set(["apk", "appbundle", "aab", "ios", "ipa", "android"]);

/**
 * Whether fakes are on: `--fakes` / `--no-fakes` when given, else on for a
 * headless run and a web build, off otherwise. A phone build refuses them.
 */
export function fakesOn(args: string[], target: { headless?: boolean; build?: string | null }): boolean {
  const phone = target.build != null && PHONE.has(target.build);
  if (args.includes("--no-fakes")) return false;
  if (args.includes("--fakes")) {
    if (phone) throw new Error(`fakes stay out of phone builds: \`fuse build ${target.build}\` doesn't take --fakes`);
    return true;
  }
  return !!target.headless || target.build === "web";
}

/** Our flags, which Flutter doesn't take. */
export function withoutFakeFlags(args: string[]): string[] {
  return args.filter((a) => a !== "--fakes" && a !== "--no-fakes");
}

/** Runs the fakes file first: the entry imports it before anything else. */
export function fuseFakesPlugin(o: { projectRoot: string; on: boolean }): Plugin {
  const entry = resolve(o.projectRoot, "src/index.tsx");
  return {
    name: "fuse-fakes",
    enforce: "pre",
    transform(code, id) {
      if (!o.on || id.split("?")[0] !== entry) return null;
      const file = fakesFile(o.projectRoot);
      if (!file) return null;
      // On the first line, so the entry's own lines keep their numbers.
      return { code: `import ${JSON.stringify(file)}; ${code}`, map: null };
    },
  };
}
