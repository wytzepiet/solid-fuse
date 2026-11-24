import type { PageConfig } from "./navigation-controller";

/** Turns a page's contents into a page of some type: `page`, `materialPage`, `heroinePage`... */
export type PageType = (child: () => JSX.Element) => PageConfig;

/** Params a path pattern names: `"users/:id"` gives `{ id: string }`. */
export type PathParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${infer Head}/${infer Rest}`
    ? PathParams<Head> & PathParams<Rest>
    : Path extends `:${infer Name}`
      ? { [K in Name]: string }
      : {};

/** Turns a param from a link (always a string) into what the page takes. */
export type ParamParsers<P> = { [K in keyof P]?: (value: string) => P[K] };

export type RouteOptions<P> = {
  /**
   * Where the route lives in a link, relative to its parent's path: `"users/:id"`.
   * A route without one can be pushed but not linked to.
   */
  path?: string;
  /**
   * The route that must sit below this one. Pushing this route goes on top
   * of the parent wherever it is; a link opens the parent first.
   */
  parent?: Route<any, any>;
  /** How the page comes in. Default: the app's page type. */
  page?: PageType;
  /**
   * Makes the route a layout: its routes push inside it, in a navigator of
   * their own, which the component gets as `children`. `"stack"`: one stack,
   * whose first page is the child without a path of its own (`path: ""`).
   * `tabs(A, B)`: a stack per tab.
   */
  navigator?: "stack" | Tabs;
  /** Parses params that arrive as strings from a link. */
  parse?: ParamParsers<P>;
  /** Names the route when it has no path, so a saved stack can find it again. */
  name?: string;
  component: (props: P & { children?: JSX.Element }) => JSX.Element;
};

/**
 * A place in the app: a component, the params it takes, and where it sits.
 * `R` is what the page gives back through `nav.pop(result)`.
 */
export interface Route<P = any, R = unknown> {
  /** The full path pattern, parents included: `"/users/:id"`. */
  readonly path: string | undefined;
  readonly parent: Route<any, any> | undefined;
  readonly page: PageType | undefined;
  readonly navigator: "stack" | Tabs | undefined;
  readonly parse: ParamParsers<P> | undefined;
  /** What a saved stack calls this route: its path, else its name. */
  readonly key: string | undefined;
  readonly component: (props: P & { children?: JSX.Element }) => JSX.Element;
  /** Says what `pop(result)` gives back: `route({...}).returns<string>()`. */
  returns<T>(): Route<P, T>;
  /** @internal type only */
  readonly __result?: R;
}

const all: Route[] = [];

function join(parent: string | undefined, path: string): string {
  if (path.startsWith("/")) return normalize(path);
  return normalize(`${parent ?? ""}/${path}`);
}

function normalize(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return "/" + parts.join("/");
}

/**
 * Tabs: each route is a tab with a stack of its own, all kept alive. The
 * tabs' paths are relative to the layout's. Give it as a layout's
 * `navigator`; its component gets the visible tab's content as `children`
 * and puts a bar next to it with `useTabs()`.
 */
export function tabs(...routes: Route<any, any>[]): Tabs {
  return { kind: "tabs", tabs: routes };
}
export type Tabs = { kind: "tabs"; tabs: Route<any, any>[] };

/** Declare a route. Its params are the props its component takes. */
export function route<P extends object = {}>(options: RouteOptions<P>): Route<P> {
  // Paths and keys are worked out when asked: a tab gets its parent when its
  // tabs layout is declared, after it.
  let parent = options.parent;
  const r: Route<P> = {
    get path() {
      if (options.path === undefined) return undefined;
      return join(parent ? findPathOf(parent) : undefined, options.path);
    },
    get parent() {
      return parent;
    },
    page: options.page,
    navigator: options.navigator,
    parse: options.parse,
    get key() {
      const path = r.path;
      // A layout's first page shares the layout's path; the saved stack tells them apart.
      if (path !== undefined && parent?.navigator && path === findPathOf(parent)) return `${path}#index`;
      return path ?? options.name;
    },
    component: options.component,
    returns: () => r as Route<P, any>,
  };
  if (typeof options.navigator === "object") {
    for (const t of options.navigator.tabs) {
      if (t.parent) throw new Error("[Fuse] a tab can't have a parent of its own; tabs() gives it the layout");
      (t as unknown as { _setParent(p: Route): void })._setParent(r);
    }
  }
  Object.defineProperty(r, "_setParent", { value: (p: Route) => (parent = p) });
  all.push(r);
  return r;
}

// A parent without a path still passes on its own parent's path.
function findPathOf(r: Route): string | undefined {
  let p: Route | undefined = r;
  while (p) {
    if (p.path !== undefined) return p.path;
    p = p.parent;
  }
  return undefined;
}

/** The route a saved stack names. */
export function routeByKey(key: string): Route | undefined {
  return all.findLast((r) => r.key === key);
}

/** The tabs of a tabs layout, else nothing. */
export function tabsOf(r: Route | undefined): Route[] | undefined {
  return typeof r?.navigator === "object" ? r.navigator.tabs : undefined;
}

/** The route and the parents below it, outermost first. */
export function chainOf(r: Route): Route[] {
  const chain: Route[] = [];
  for (let p: Route | undefined = r; p; p = p.parent) chain.unshift(p);
  return chain;
}

/** A layout's first page: its child without a path of its own. */
export function indexOf(layout: Route): Route | undefined {
  if (tabsOf(layout)) return undefined;
  return all.find((r) => r.parent === layout && r.path !== undefined && r.path === findPathOf(layout));
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

/**
 * Find the route a link points at. Static segments beat params; a link's
 * query string adds params too (`/search?q=solid`).
 */
export function matchLink(link: string): Match | undefined {
  const [pathPart, query = ""] = link.split("?", 2) as [string, string?];
  const segments = normalize(pathPart.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")).split("/").filter(Boolean);
  let best: { route: Route; raw: Record<string, string>; score: number } | undefined;
  for (const r of all) {
    if (r.path === undefined) continue;
    // A layout and its first page share a path; the page is what a link opens.
    if (r.navigator && indexOf(r)) continue;
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
    if (ok && (!best || score > best.score)) best = { route: r, raw, score };
  }
  if (!best) return undefined;
  for (const [k, v] of new URLSearchParams(query)) if (!(k in best.raw)) best.raw[k] = v;
  return { route: best.route, params: parseParams(best.route, best.raw) };
}

/** Apply a route's parsers, and its parents', to string params. */
export function parseParams(r: Route, raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  for (let p: Route | undefined = r; p; p = p.parent) {
    for (const [k, parse] of Object.entries(p.parse ?? {})) {
      if (typeof raw[k] === "string" && typeof parse === "function") out[k] = parse(raw[k]!);
    }
  }
  return out;
}

/** The link to a route with these params: `linkTo(Profile, { id: 42 })` is `"/users/42"`. */
export function linkTo<P>(r: Route<P, any>, params?: P): string {
  if (r.path === undefined) throw new Error("[Fuse] linkTo: this route has no path");
  const p = (params ?? {}) as Record<string, unknown>;
  return r.path
    .split("/")
    .map((s) => {
      if (!s.startsWith(":")) return s;
      const v = p[s.slice(1)];
      if (v === undefined) throw new Error(`[Fuse] linkTo ${r.path}: missing param ${s.slice(1)}`);
      return encodeURIComponent(String(v));
    })
    .join("/") || "/";
}

/** For tests: forget every route. */
export function _resetRoutes() {
  all.length = 0;
}
