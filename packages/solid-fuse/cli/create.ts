import { spawnSync } from "child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, join, relative, resolve } from "path";
import { createInterface } from "readline/promises";
import { defineCommand } from "citty";
import { runLink } from "./link";
import { PLATFORMS, ensureRunners } from "./runners";
import type { FusePlatform } from "../src/config";

const DESIGNS = ["material", "cupertino", "adaptive", "none"] as const;
type Design = (typeof DESIGNS)[number];

const packageRoot = resolve(import.meta.dirname, "..");
const ownPackage = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf-8")) as { version: string };

export interface CreateOptions {
  dir: string;
  design: Design;
  platforms: FusePlatform[];
  org: string;
  /** A template directory or `github:owner/repo[/path][#ref]`. Default: the built-in app. */
  template?: string;
  install: boolean;
  git: boolean;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(cmd: string, args: string[], cwd: string, quiet = false) {
  const r = spawnSync(cmd, args, { cwd, stdio: quiet ? "ignore" : "inherit" });
  if (r.error || r.status !== 0) fail(`\`${cmd} ${args.join(" ")}\` failed in ${cwd}.`);
}

/** bun, npm, pnpm or yarn: whichever ran us (`bun create`, `npm create`...). */
export function packageManager(userAgent = process.env.npm_config_user_agent ?? ""): string {
  const name = userAgent.split("/")[0];
  if (["npm", "pnpm", "yarn", "bun"].includes(name)) return name;
  return process.versions.bun ? "bun" : "npm";
}

/** A Dart package name: lowercase, digits and `_`, not starting with a digit. */
export function dartName(name: string): string {
  const s = name.toLowerCase().replace(/^@[^/]+\//, "").replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[0-9]/.test(s) || !s ? `app_${s}` : s;
}

/** `my-app` → `My App` */
export function title(name: string): string {
  return basename(name).split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/**
 * The workspace this app lands in when it is created inside a monorepo that
 * also has solid-fuse as a workspace package (this repo's `examples/`):
 * then it depends on the packages there instead of npm.
 */
function workspaceRoot(target: string): string | null {
  for (let dir = dirname(target); ; dir = dirname(dir)) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      const json = JSON.parse(readFileSync(pkg, "utf-8"));
      if (json.workspaces && relative(dir, packageRoot).split("/")[0] !== "..") return dir;
    }
    if (dirname(dir) === dir) return null;
  }
}

function designPackages(design: Design): string[] {
  return design === "none" ? [] : [`@solid-fuse/${design}`];
}

/** Fetch a `github:owner/repo[/path][#ref]` template into a temp directory. */
function fetchTemplate(spec: string): { dir: string; cleanup: () => void } {
  if (!spec.startsWith("github:")) {
    const dir = resolve(spec);
    if (!existsSync(dir)) fail(`No template at ${dir}.`);
    return { dir, cleanup: () => {} };
  }
  const [path, ref] = spec.slice("github:".length).split("#");
  const [owner, repo, ...sub] = path.split("/");
  const tmp = mkdtempSync(join(tmpdir(), "fuse-template-"));
  const args = ["clone", "--depth", "1", ...(ref ? ["--branch", ref] : []), `https://github.com/${owner}/${repo}.git`, tmp];
  run("git", args, process.cwd(), true);
  return { dir: join(tmp, ...sub), cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

function copyTemplate(from: string, to: string, design: Design, vars: Record<string, string>) {
  cpSync(from, to, {
    recursive: true,
    filter: (src) => !/[\\/](\.git|node_modules)$/.test(src),
  });
  // One source file per design: src/index.<design>.tsx → src/index.tsx, and
  // so on in src/app.
  const pick = (dir: string) => {
    for (const f of readdirSync(dir)) {
      if (statSync(join(dir, f)).isDirectory()) {
        pick(join(dir, f));
        continue;
      }
      const m = f.match(/^(.*)\.(material|cupertino|adaptive|none)(\.[^.]+)$/);
      if (!m) continue;
      if (m[2] === design) renameSync(join(dir, f), join(dir, m[1] + m[3]));
      else rmSync(join(dir, f));
    }
  };
  if (existsSync(join(to, "src"))) pick(join(to, "src"));
  // npm drops .gitignore from published packages.
  for (const dir of [to, join(to, "dart")]) {
    if (existsSync(join(dir, "_gitignore"))) renameSync(join(dir, "_gitignore"), join(dir, ".gitignore"));
  }
  substitute(to, vars);
}

function substitute(dir: string, vars: Record<string, string>) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      substitute(path, vars);
      continue;
    }
    const text = readFileSync(path, "utf-8");
    if (!text.includes("{{")) continue;
    writeFileSync(path, text.replace(/\{\{(\w+)\}\}/g, (all, key) => vars[key] ?? all));
  }
}

function writePackageJson(target: string, name: string, design: Design, depVersion: string) {
  const path = join(target, "package.json");
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : {};
  const deps: Record<string, string> = { "solid-fuse": depVersion, "solid-js": "^2.0.3" };
  for (const p of designPackages(design)) deps[p] = depVersion;
  const pkg = {
    name,
    private: true,
    version: "0.1.0",
    type: "module",
    ...existing,
    scripts: { dev: "fuse dev", build: "fuse build", drive: "fuse drive", ...existing.scripts },
    dependencies: { ...deps, ...existing.dependencies },
    devDependencies: { typescript: "^7.0.2", ...existing.devDependencies },
  };
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
}

export async function create(opts: CreateOptions) {
  const target = resolve(opts.dir);
  const name = basename(target);
  if (existsSync(target) && readdirSync(target).length > 0) fail(`${opts.dir} exists and is not empty.`);

  const workspace = workspaceRoot(target);
  const pm = workspace ? "bun" : packageManager();
  const runCmd = pm === "npm" ? "npm run" : pm;
  const vars = {
    name,
    dartName: dartName(name),
    title: title(name),
    run: runCmd,
    platforms: `[${opts.platforms.map((p) => `"${p}"`).join(", ")}]`,
    // Material's icon font, which material_ui's Icons need.
    materialFonts: opts.design === "material" || opts.design === "adaptive" ? "  uses-material-design: true\n" : "",
    org: opts.org,
  };

  console.log(`Creating ${vars.title} in ${target}`);
  const template = fetchTemplate(opts.template ?? join(packageRoot, "templates", "app"));
  try {
    copyTemplate(template.dir, target, opts.design, vars);
  } finally {
    template.cleanup();
  }
  writePackageJson(target, name, opts.design, workspace ? "workspace:*" : `^${ownPackage.version}`);

  // The platform folders, so the first commit has them. Later ones come
  // from `fuse dev` / `fuse build` (cli/runners.ts).
  ensureRunners(join(target, "dart"), opts.platforms, { org: opts.org });

  if (opts.install) {
    console.log(`Installing with ${pm}...`);
    run(pm, ["install"], workspace ?? target);
    // pub get, generated components, Dart glue.
    await runLink(target);
  }

  if (opts.git && !workspace && spawnSync("git", ["--version"]).status === 0) {
    run("git", ["init", "-q"], target);
    run("git", ["add", "-A"], target);
    spawnSync("git", ["commit", "-qm", "Initial commit (fuse create)"], { cwd: target, stdio: "ignore" });
  }

  const cd = relative(process.cwd(), target) || ".";
  console.log(`\nDone. Next:\n\n  cd ${cd}${opts.install ? "" : `\n  ${pm} install`}\n  ${runCmd} dev\n`);
  console.log(`No screen (cloud, CI)? \`${runCmd} dev --headless\`, then \`${pm === "npm" ? "npx" : pm === "bun" ? "bunx" : pm} fuse drive\`.`);
}

async function ask(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(`${question} (${fallback}) `)).trim() || fallback;
  } finally {
    rl.close();
  }
}

export const createCommand = defineCommand({
  meta: {
    name: "create",
    description: "Create a new Fuse app",
  },
  args: {
    dir: { type: "positional", required: false, description: "Directory of the new app" },
    design: { type: "string", description: `${DESIGNS.join(" | ")} (default material)` },
    platforms: { type: "string", description: `Comma-separated: ${PLATFORMS.join(",")} (default android,ios)` },
    org: { type: "string", description: "Reverse domain for the bundle id (default com.example)" },
    template: { type: "string", description: "A template directory, or github:owner/repo[/path][#ref]" },
    install: { type: "boolean", default: true, description: "Install packages (--no-install to skip)" },
    git: { type: "boolean", default: true, description: "git init (--no-git to skip)" },
    yes: { type: "boolean", alias: "y", description: "Use the defaults for everything not given" },
  },
  run: async ({ args }) => {
    const interactive = !args.yes && process.stdin.isTTY;
    const pick = (value: string | undefined, question: string, fallback: string) =>
      value ?? (interactive ? ask(question, fallback) : Promise.resolve(fallback));

    const dir = args.dir ?? (await pick(undefined, "App directory?", "my-app"));
    const design = (await pick(args.design, `Design? ${DESIGNS.join(", ")}`, "material")) as Design;
    if (!DESIGNS.includes(design)) fail(`Unknown design "${design}". Pick one of: ${DESIGNS.join(", ")}.`);
    const platforms = (await pick(args.platforms, `Platforms? ${PLATFORMS.join(", ")}`, "android,ios"))
      .split(",").map((p) => p.trim()).filter(Boolean) as FusePlatform[];
    const unknown = platforms.filter((p) => !PLATFORMS.includes(p));
    if (unknown.length) fail(`Unknown platform: ${unknown.join(", ")}. Fuse runs on ${PLATFORMS.join(", ")}.`);
    const org = args.org ?? "com.example";

    if (spawnSync("flutter", ["--version"], { stdio: "ignore" }).status !== 0) {
      fail("Fuse apps need Flutter 3.50 or newer on the PATH: https://docs.flutter.dev/get-started/install");
    }

    await create({ dir, design, platforms, org, template: args.template, install: args.install, git: args.git });
  },
});
