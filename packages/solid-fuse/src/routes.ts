import type { PageConfig } from "./navigation";

/** Turns a page's contents into a page of some type: `page`, `materialPage`, `heroinePage`... */
export type PageType = (child: () => JSX.Element) => PageConfig;

/**
 * What the app adds to solid-fuse's types. File routes fill in `address`,
 * the addresses the app has, so `push` and `go` check them:
 * `declare module "solid-fuse" { interface Register { address: "/" | \`/users/${string}\` } }`.
 */
// biome-ignore lint: filled in by declaration merging
export interface Register {}

/** An address in the app: any string, or the app's own addresses once file routes register them. */
export type Address = Register extends { address: infer A } ? A : string;

/** Params a path pattern names: `"/users/:id"` gives `{ id: string }`. */
export type PathParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${infer Head}/${infer Rest}`
    ? PathParams<Head> & PathParams<Rest>
    : Path extends `:${infer Name}`
      ? { [K in Name]: string }
      : {};

/**
 * Turns the params from an address (always strings, from the path and the
 * query) into what the page takes. What it returns is merged over them. A
 * throw means the address isn't this page's: another page may match it.
 */
// `any` in: a file's parse is written on its own, so it names what it reads (`p: { id: string }`).
export type ParseParams<P> = (params: any) => Partial<P>;

export type RouteOptions<P> = {
  /**
   * The page's address: `"/users/:id"`. A route without one can be pushed
   * but not linked to or restored.
   */
  path?: string;
  /**
   * The page whose stacks this one opens in. Without it, the page opens on
   * the app's own stack. A page with pages in it holds stacks: it renders
   * `<Navigator>`s for them.
   */
  in?: Route<any, any>;
  /** How the page comes in. Default: the app's page type. */
  page?: PageType;
  /** Parses the params an address brings, which are strings: `(p) => ({ id: Number(p.id) })`. */
  parse?: ParseParams<P>;
  component: (props: P) => JSX.Element;
};

/**
 * A page of the app: a component, the params it takes, its address, and
 * the page whose stacks it opens in. `R` is what it gives back through
 * `nav.pop(result)`.
 */
export interface Route<P = any, R = unknown> {
  readonly path: string | undefined;
  /** The page whose stacks this one opens in; none for the app's own stack. */
  readonly in: Route<any, any> | undefined;
  readonly page: PageType | undefined;
  readonly parse: ParseParams<P> | undefined;
  /** What a saved tree calls this route. */
  readonly key: string | undefined;
  readonly component: (props: P) => JSX.Element;
  /** Says what `pop(result)` gives back: `route({...}).returns<string>()`. */
  returns<T>(): Route<P, T>;
  /** @internal type only */
  readonly __result?: R;
}

const all: Route[] = [];

export function normalize(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return "/" + parts.join("/");
}

/** Declare a page. Its params are the props its component takes. */
export function route<P extends object = {}>(options: RouteOptions<P>): Route<P> {
  const path = options.path === undefined ? undefined : normalize(options.path);
  const r: Route<P> = {
    path,
    in: options.in,
    // Read when used: file routes pass getters (cli/routes.ts).
    get page() {
      return options.page;
    },
    get parse() {
      return options.parse;
    },
    get key() {
      if (path === undefined) return undefined;
      // A holder and its stack's first page share an address.
      return options.in && options.in.path === path ? `${path}#${options.in.key ?? ""}` : path;
    },
    get component() {
      return options.component;
    },
    returns: () => r as Route<P, any>,
  };
  all.push(r);
  return r;
}

export function isRoute(x: unknown): x is Route {
  return typeof x === "object" && x !== null && "component" in x && "returns" in x;
}

/** Every route, oldest first. */
export function allRoutes(): readonly Route[] {
  return all;
}

/** The route a saved tree names. */
export function routeByKey(key: string): Route | undefined {
  return all.findLast((r) => r.key === key);
}

/** The holders a route opens in, outermost first (not the route itself). */
export function holdersOf(r: Route): Route[] {
  const chain: Route[] = [];
  for (let h = r.in; h; h = h.in) {
    if (chain.includes(h)) throw new Error(`[Fuse] route ${r.path}: its holders go round in a circle`);
    chain.unshift(h);
  }
  return chain;
}

/** The route at a stack's first page: `index` is its address, `holder` the page holding it. */
export function indexRoute(holder: Route | undefined, index: string): Route | undefined {
  return all.findLast((r) => r.in === holder && r.path !== undefined && samePattern(r.path, index));
}

function samePattern(pattern: string, address: string): boolean {
  const a = pattern.split("/").filter(Boolean);
  const b = normalize(address).split("/").filter(Boolean);
  return a.length === b.length && a.every((s, i) => s === b[i] || s.startsWith(":"));
}

/** The names `:name` takes in a path pattern. */
export function paramNames(path: string | undefined): string[] {
  if (!path) return [];
  return path
    .split("/")
    .filter((s) => s.startsWith(":"))
    .map((s) => s.slice(1));
}

export type Match = { route: Route; params: Record<string, unknown> };

function depth(r: Route): number {
  let d = 0;
  for (let h = r.in; h; h = h.in) d++;
  return d;
}

/**
 * Find the route at an address. Static segments beat params; a holder and
 * its first page share an address, and the page wins. A query string adds
 * params too (`/search?q=solid`).
 */
export function matchAddress(address: string): Match | undefined {
  const [pathPart, query = ""] = address.split("?", 2) as [string, string?];
  const segments = normalize(pathPart.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, ""))
    .split("/")
    .filter(Boolean);
  const found: { route: Route; raw: Record<string, string>; score: number }[] = [];
  for (const r of all) {
    if (r.path === undefined) continue;
    const pattern = r.path.split("/").filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const raw: Record<string, string> = {};
    let score = 0;
    let ok = true;
    for (let i = 0; i < pattern.length; i++) {
      const p = pattern[i]!;
      const s = decodeURIComponent(segments[i]!);
      if (p.startsWith(":")) raw[p.slice(1)] = s;
      else if (p === s) score += 2 ** (pattern.length - i);
      else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    // Deeper wins a tie: the first page inside its holder; a later route wins a full tie.
    found.push({ route: r, raw, score: score * 64 + depth(r) });
  }
  const search = [...new URLSearchParams(query)];
  // Best first; a page whose parse throws doesn't match, and the next one gets a go.
  for (const f of found.map((f, i) => [f, i] as const).sort(([a, i], [b, j]) => b.score - a.score || j - i)) {
    const raw = f[0].raw;
    for (const [k, v] of search) if (!(k in raw)) raw[k] = v;
    try {
      return { route: f[0].route, params: parseParams(f[0].route, raw) };
    } catch {}
  }
  return undefined;
}

/**
 * Apply a route's parse, and its holders' (outermost first), to the string
 * params an address brings. Throws when one of them does.
 */
export function parseParams(r: Route, raw: Record<string, string>, own = false): Record<string, unknown> {
  let out: Record<string, unknown> = { ...raw };
  for (const p of own ? [r] : [...holdersOf(r), r]) if (p.parse) out = { ...out, ...(p.parse(raw) as object) };
  return out;
}

/**
 * The address of a route with these params: `addressOf(User, { id: 42 })` is
 * `"/users/42"`. Other params that are strings, numbers or booleans go in the
 * query, so the address opens the same page: `{ id: 42, tab: "likes" }` is
 * `"/users/42?tab=likes"`.
 */
export function addressOf<P>(r: Route<P, any>, params?: P): string {
  if (r.path === undefined) throw new Error("[Fuse] addressOf: this route has no path");
  const p = (params ?? {}) as Record<string, unknown>;
  const names = paramNames(r.path);
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (!names.includes(k) && ["string", "number", "boolean"].includes(typeof v)) query.append(k, String(v));
  }
  const q = query.size ? `?${query}` : "";
  return (
    (r.path
      .split("/")
      .map((s) => {
        if (!s.startsWith(":")) return s;
        const v = p[s.slice(1)];
        if (v === undefined) throw new Error(`[Fuse] addressOf ${r.path}: missing param ${s.slice(1)}`);
        return encodeURIComponent(String(v));
      })
      .join("/") || "/") + q
  );
}

/** For tests: forget every route. */
export function _resetRoutes() {
  all.length = 0;
}
