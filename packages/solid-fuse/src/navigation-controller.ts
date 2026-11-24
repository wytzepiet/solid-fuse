import {
  createComponent,
  createContext,
  createSignal,
  getOwner,
  onCleanup,
  untrack,
  useContext,
} from "solid-js";
import { on, send } from "./channels";
import { usePageType } from "./pages/page";
import {
  chainOf,
  indexOf,
  linkTo,
  matchLink,
  paramNames,
  routeByKey,
  tabsOf,
  type PageType,
  type Link,
  type Route,
} from "./routes";

/**
 * A page config — what `page({...})`, `materialPage({...})`, `cupertinoPage({...})`, etc.
 * return. Just data: `type` names a Dart handle factory; `child` is the
 * page's JSX thunk; `props` are extra per-type options (name, duration, etc.)
 * that land on the FuseNode for the handle to read.
 */
export type PageConfig<P = any> = {
  type: string;
  child: () => JSX.Element;
  props: P;
};

/** An entry in the pages signal. */
export type PageEntry = {
  id: number;
  config: PageConfig;
  resolve: (value: any) => void;
  /** The route it shows, when pushed by route. */
  route?: Route;
  params?: Record<string, unknown>;
  /** A layout's own navigator. */
  inner?: NavigationController;
  /** A tabs layout's tabs. */
  tabs?: TabsState;
};

/** A tabs layout's state: what `useTabs()` gives. */
export type TabsState = {
  /** The tab routes, in order. */
  readonly routes: Route[];
  /** Each tab's navigator. */
  readonly navigators: NavigationController[];
  /** Reactive: the visible tab. */
  index: () => number;
  /** Show a tab. The visible one again pops it to its first page. */
  select: (index: number) => void;
};

/** What a route push can override. */
export type PushOptions = { page?: PageType };

/** A route's params: optional when it takes none. */
type ParamsArg<P> = {} extends P ? [params?: P, options?: PushOptions] : [params: P, options?: PushOptions];

type Pushable = PageConfig | (() => JSX.Element);

/** A saved stack: what `nav.save()` gives and `restore` takes. Plain JSON. */
export type SavedStack = SavedEntry[];
/** `r` is the route's key; `null` stands for a first page that isn't a route. */
export type SavedEntry = {
  r: string | null;
  p?: Record<string, unknown>;
  /** A layout's stack. */
  i?: SavedStack;
  /** A tabs layout's stacks, and the visible one. */
  t?: SavedStack[];
  at?: number;
};

export type NavigationController = {
  /** Reactive page stack. Passed to `<For>` inside the Navigator wrapper. */
  pages: () => PageEntry[];
  /** Reactive stack depth — components can `nav.stackDepth() > 1`. */
  stackDepth: () => number;
  /** The navigator this one sits in, if any. */
  readonly parent: NavigationController | undefined;
  /** The layout route this navigator belongs to, if any. */
  readonly layout: Route | undefined;
  /**
   * Push a route with its params, or a page. Resolves with the value from
   * `pop(result)`, or `null` when the page goes any other way (back
   * gesture, `replaceAll`, `popUntil`, disposal).
   *
   * A route goes on this stack, unless its parent is somewhere else: then
   * it goes on top of the parent. A parent that isn't open yet is opened
   * first, with the same params.
   */
  push: {
    <P, R>(route: Route<P, R>, ...args: ParamsArg<P>): Promise<R | null>;
    <T = unknown>(page: Pushable): Promise<T | null>;
  };
  /**
   * Open a link (`"/users/42"`) or a route: the app's root stack goes back
   * to its first page, then the route opens on it with its parents below.
   */
  go: {
    (link: Link): void;
    <P>(route: Route<P, any>, ...args: ParamsArg<P>): void;
  };
  /**
   * Pop the top page with an optional result. On a layout's last page, this
   * closes the layout. Otherwise a no-op on a single-entry stack.
   */
  pop: (result?: unknown) => void;
  pushReplacement: <T = unknown>(cfg: Pushable, result?: unknown) => Promise<T | null>;
  /**
   * Pop until a page of this route (or with this page `name`) is on top,
   * or to the root if none given. If none is on the stack, this is a no-op
   * (with a dev warning).
   */
  popUntil: (target?: string | Route) => void;
  /**
   * Replace the entire stack. Existing pages' push-promises resolve with
   * `null`. Returns a promise per new page. Refuses to empty the stack.
   */
  replaceAll: (cfgs: Pushable[]) => Promise<unknown>[];
  /** The stack as JSON, routes only: pages above the first non-route are left out. */
  save: () => SavedStack;
  /** Put back a stack `save()` gave. Routes it can't find are left out, with the pages above them. */
  restore: (saved: SavedStack) => void;
  /**
   * Called by the Navigator widget when Flutter removes a page (hardware
   * back, swipe, or a declarative mid-stack removal whose animation just
   * completed). Resolves the removed entry's push-promise with `null`.
   * Unknown ids are no-ops.
   */
  onDidRemovePage: (id: number) => void;
};

export const NavigationContext = createContext<NavigationController>();

// Every live navigator, oldest first: a push looks here for a route's parent.
const live = new Set<Internal>();
let nextId = 0;

type Internal = NavigationController & {
  _entries: () => PageEntry[];
  _add: (route: Route, params: Record<string, unknown>, options?: PushOptions) => PageEntry & { promise: Promise<any> };
  _remove: (id: number, result: unknown) => void;
  _reset: () => void;
  _dispose: () => void;
  _layoutEntry?: PageEntry;
  _layoutParams?: Record<string, unknown>;
  /** Show this navigator: select its tab, and its parents'. */
  _reveal: () => void;
  _shown: () => boolean;
};

type TabsInternal = TabsState & { navigators: Internal[]; _set: (i: number) => void };

/** The navigator a layout entry's routes go in: `next`'s tab, or the visible one. */
function innerFor(e: PageEntry | undefined, next: Route | undefined): Internal | undefined {
  const t = e?.tabs as TabsInternal | undefined;
  if (!t) return e?.inner as Internal | undefined;
  const i = next ? t.routes.indexOf(next) : -1;
  if (i >= 0) t._set(i);
  return t.navigators[i >= 0 ? i : t.index()];
}

function sameParams(r: Route, a: Record<string, unknown> = {}, b: Record<string, unknown> = {}, strict: boolean) {
  const names = paramNames(r.path);
  const keys = names.length || !strict ? names : [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.every((k) => String(a[k]) === String(b[k]));
}

/** The navigator that holds `parent`: its layout's own, or one with a page of it. */
function holderOf(from: Internal, parent: Route, params: Record<string, unknown>): Internal | undefined {
  // A layout holds its routes in its own navigator, not in the stack it sits on.
  const holds = (n: Internal) =>
    parent.navigator
      ? n.layout === parent && sameParams(parent, n._layoutParams, params, false)
      : n._entries().some((e) => e.route === parent && sameParams(parent, e.params, params, false));
  for (let n: Internal | undefined = from; n; n = n.parent as Internal | undefined) if (holds(n)) return n;
  // Elsewhere: a visible tab before a hidden one.
  for (const n of live) if (holds(n) && n._shown()) return n;
  for (const n of live) if (holds(n)) return n;
  return undefined;
}

/**
 * Open `chain` (outermost first) in `start`. A layout opens with its own
 * navigator, and the rest of the chain goes in there. With `reuse`, a page
 * already on top for the same route and params stays instead of a new one.
 */
function openChain(
  start: Internal,
  chain: Route[],
  params: Record<string, unknown>,
  options: PushOptions | undefined,
  reuse: boolean,
): Promise<any> {
  let n = start;
  for (let i = 0; i < chain.length; i++) {
    const r = chain[i]!;
    const last = i === chain.length - 1;
    const top = n._entries().at(-1);
    if ((reuse || !last) && top?.route === r && sameParams(r, top.params, params, last)) {
      if (last) return Promise.resolve(null);
      const inner = innerFor(top, chain[i + 1]);
      if (inner) {
        // A link shows just its chain: an open layout goes back to its first page.
        if (reuse) inner._reset();
        n = inner;
      }
      continue;
    }
    // A parent opened on the way gets the params its path names.
    const own = last ? params : pick(params, paramNames(r.path));
    const e = n._add(r, own, last ? options : undefined);
    if (last) return e.promise;
    n = innerFor(e, chain[i + 1]) ?? n;
  }
  return Promise.resolve(null);
}

function pick(params: Record<string, unknown>, names: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of names) if (k in params) out[k] = params[k];
  return out;
}

function rootOf(n: Internal): Internal {
  let r = n;
  while (r.parent) r = r.parent as Internal;
  return r;
}

/**
 * Create a navigation controller — pure JS state (a pages signal plus
 * imperative helpers). The actual Flutter Navigator is mounted by the
 * `<Navigator>` wrapper, which renders this controller's pages as JSX
 * children of a `<navigator>` intrinsic.
 *
 * Inside another `<Navigator>`, it sits in that one: a push of a route
 * whose parent is out there goes there.
 *
 * If called inside a reactive owner, pending push-promises auto-resolve
 * with `null` when the owner disposes.
 */
export function createNavigationController(
  opts: { initialPage?: Route | Pushable } = {},
): NavigationController {
  const owner = getOwner();
  const asPage = usePageType();
  const parent = owner ? (outerNavigation() as Internal | undefined) : undefined;
  const nav = makeController({ asPage, parent });
  const initial = untrack(() => opts.initialPage);
  if (initial) {
    if (isRoute(initial)) nav._add(initial, {});
    else nav.push(initial);
  }
  if (owner) onCleanup(() => nav._dispose());
  if (!parent) {
    roots.add(nav);
    if (pendingRestore !== undefined) {
      const saved = pendingRestore;
      pendingRestore = undefined;
      pendingLink = undefined;
      nav.restore(saved);
    } else if (pendingLink !== undefined) {
      const link = pendingLink;
      pendingLink = undefined;
      openLink(nav, link);
    }
  }
  return nav;
}

function isRoute(x: unknown): x is Route {
  return typeof x === "object" && x !== null && "component" in x && "returns" in x;
}

function makeController(init: {
  asPage: PageType;
  parent?: Internal;
  layout?: Route;
  /** A stack layout's entry: popping its last page closes it. */
  layoutEntry?: PageEntry;
  layoutParams?: Record<string, unknown>;
  /** A tab's place in its tabs. */
  tab?: { tabs: TabsInternal; index: number };
}): Internal {
  const { asPage } = init;

  // `ownedWrite: true` because setPages is also called from cleanups, which
  // can run while a parent owner is still in scope. Every write in this
  // module is intentional.
  const [signal, setSignal] = createSignal<PageEntry[]>([], { ownedWrite: true });
  // Tracks the signal, reads what's current.
  const pages = () => (signal(), list);
  // The stack as it is now. Solid shows writes to the signal after a flush,
  // and a push builds on the one before it in the same tick.
  let list: PageEntry[] = [];
  const setPages = (next: PageEntry[] | ((prev: PageEntry[]) => PageEntry[])) => {
    list = typeof next === "function" ? next(list) : next;
    setSignal(list);
    scheduleSave();
  };

  function entryFor(config: PageConfig, extra?: Partial<PageEntry>): PageEntry & { promise: Promise<any> } {
    let resolve!: (v: any) => void;
    const promise = new Promise<any>((r) => (resolve = r));
    return { id: nextId++, config, resolve, promise, ...extra };
  }

  function append(e: PageEntry) {
    setPages((prev) => [...prev, e]);
  }

  function settle(dropped: PageEntry[], result: unknown) {
    for (const e of dropped) {
      (e.inner as Internal | undefined)?._dispose();
      for (const t of (e.tabs as TabsInternal | undefined)?.navigators ?? []) t._dispose();
      e.resolve(result);
    }
  }

  function removeEntry(id: number, result: unknown) {
    const removed = list.filter((e) => e.id === id);
    if (!removed.length) return;
    setPages((prev) => prev.filter((e) => e.id !== id));
    settle(removed, result);
  }

  function pushPage<T>(cfg: Pushable): Promise<T | null> {
    const e = entryFor(typeof cfg === "function" ? asPage(cfg) : cfg);
    append(e);
    return e.promise;
  }

  function add(route: Route, params: Record<string, unknown>, options?: PushOptions) {
    const pageType = options?.page ?? route.page ?? asPage;
    let inner: Internal | undefined;
    let tabs: TabsInternal | undefined;
    const props = { ...params };
    const e = entryFor(
      pageType(() => {
        if (inner) return createComponent(route.component as any, { ...props, get children() { return renderLayout(inner!); } });
        if (tabs) {
          const t = tabs;
          return createComponent(TabsContext as any, {
            value: t,
            get children() {
              return createComponent(route.component as any, { ...props, get children() { return renderTabs(t); } });
            },
          });
        }
        return createComponent(route.component as any, props);
      }),
      { route, params: props },
    );
    const tabRoutes = tabsOf(route);
    if (tabRoutes) {
      tabs = makeTabs(tabRoutes);
      e.tabs = tabs;
      tabRoutes.forEach((t, i) => {
        const c = makeController({ asPage, parent: nav, layout: route, layoutParams: props, tab: { tabs: tabs!, index: i } });
        c._add(t, pick(params, paramNames(t.path)));
        tabs!.navigators.push(c);
      });
    } else if (route.navigator) {
      inner = makeController({ asPage, parent: nav, layout: route, layoutEntry: e, layoutParams: props });
      e.inner = inner;
      const index = indexOf(route);
      if (index) inner._add(index, params);
    }
    append(e);
    return e;
  }

  const nav: Internal = {
    pages,
    stackDepth: () => pages().length,
    parent: init.parent,
    layout: init.layout,
    _layoutEntry: init.layoutEntry,
    _layoutParams: init.layoutParams,
    _reveal: () => {
      if (init.tab) init.tab.tabs._set(init.tab.index);
      init.parent?._reveal();
    },
    _shown: () => (init.tab ? init.tab.tabs.index() === init.tab.index : true) && (init.parent?._shown() ?? true),
    push: ((target: Route | Pushable, params?: Record<string, unknown>, options?: PushOptions) => {
      if (!isRoute(target)) return pushPage(target);
      const p = params ?? {};
      const chain = chainOf(target);
      // Go on top of the nearest parent that's open; open the rest.
      for (let k = chain.length - 2; k >= 0; k--) {
        const holder = holderOf(nav, chain[k]!, p);
        if (holder) {
          // A layout's own navigator takes the rest; a stack with a page of it, on top.
          holder._reveal();
          return openChain(holder, chain.slice(k + 1), p, options, false);
        }
      }
      return openChain(nav, chain, p, options, false);
    }) as NavigationController["push"],
    go: ((target: string | Route, params?: Record<string, unknown>) => {
      openLink(rootOf(nav), typeof target === "string" ? target : linkTo(target, params as any));
    }) as NavigationController["go"],
    pop: (result) => {
      const current = list;
      if (current.length <= 1) {
        if (nav._layoutEntry && nav.parent) {
          (nav.parent as Internal)._remove(nav._layoutEntry.id, result);
          return;
        }
        console.warn("[Fuse] nav.pop() ignored — cannot pop the root page");
        return;
      }
      removeEntry(current[current.length - 1]!.id, result);
    },
    pushReplacement: <T,>(cfg: Pushable, result?: unknown) => {
      const current = list;
      if (current.length > 0) removeEntry(current[current.length - 1]!.id, result);
      return pushPage<T>(cfg);
    },
    popUntil: (target) => {
      const current = list;
      let idx = 0;
      if (target !== undefined) {
        idx = current.findLastIndex((e) =>
          typeof target === "string" ? (e.config.props as { name?: string })?.name === target : e.route === target,
        );
        if (idx < 0) {
          console.warn(`[Fuse] nav.popUntil(${typeof target === "string" ? JSON.stringify(target) : target.key ?? "route"}) ignored — not on the stack`);
          return;
        }
      }
      setPages(current.slice(0, idx + 1));
      settle(current.slice(idx + 1), null);
    },
    replaceAll: (cfgs) => {
      if (cfgs.length === 0) {
        console.warn("[Fuse] nav.replaceAll([]) ignored — would leave the navigator empty");
        return [];
      }
      const current = list;
      setPages([]);
      settle(current, null);
      return cfgs.map((cfg) => pushPage(cfg));
    },
    save: () => {
      const out: SavedStack = [];
      for (const [i, e] of list.entries()) {
        if (!e.route) {
          if (i === 0) {
            out.push({ r: null });
            continue;
          }
          break;
        }
        if (e.route.key === undefined || !jsonSafe(e.params)) break;
        const s: SavedEntry = { r: e.route.key };
        if (e.params && Object.keys(e.params).length) s.p = e.params;
        if (e.inner) s.i = e.inner.save();
        if (e.tabs) {
          s.t = e.tabs.navigators.map((n) => n.save());
          s.at = untrack(e.tabs.index);
        }
        out.push(s);
      }
      return out;
    },
    restore: (saved) => {
      const current = list;
      // The first page stays when the save kept it as "not a route".
      const keepFirst = saved[0]?.r === null && current[0] && !current[0].route;
      setPages(keepFirst ? current.slice(0, 1) : []);
      settle(keepFirst ? current.slice(1) : current, null);
      for (const s of saved) {
        if (s.r === null) continue;
        const r = routeByKey(s.r);
        if (!r) break;
        const e = add(r, s.p ?? {});
        if (e.inner && s.i) e.inner.restore(s.i);
        if (e.tabs && s.t) {
          const t = e.tabs as TabsInternal;
          s.t.forEach((saved, i) => t.navigators[i]?.restore(saved));
          t._set(Math.min(s.at ?? 0, t.navigators.length - 1));
        }
      }
    },
    onDidRemovePage: (id) => removeEntry(id, null),
    _entries: () => list,
    _add: add,
    _remove: removeEntry,
    _reset: () => {
      const current = list;
      setPages(current.slice(0, 1));
      settle(current.slice(1), null);
    },
    _dispose: () => {
      live.delete(nav);
      roots.delete(nav);
      const current = list;
      setPages([]);
      settle(current, null);
    },
  };
  live.add(nav);
  return nav;
}

function jsonSafe(v: unknown): boolean {
  try {
    return JSON.stringify(JSON.parse(JSON.stringify(v ?? {}))) === JSON.stringify(v ?? {});
  } catch {
    return false;
  }
}

// ── Links ───────────────────────────────────────────────────────────────

const roots = new Set<Internal>();
let pendingLink: string | undefined;

function openLink(root: Internal, link: string) {
  const m = matchLink(link);
  if (!m) {
    console.warn(`[Fuse] no route for the link ${JSON.stringify(link)}`);
    return;
  }
  root._reset();
  openChain(root, chainOf(m.route), m.params, undefined, true);
}

/**
 * Open a link in the app's root navigator: what Dart calls when the OS
 * opens one. Before a root navigator exists, the first one opens it.
 */
export function openAppLink(link: string) {
  const root = [...roots].at(-1);
  if (root) openLink(root, link);
  else pendingLink = link;
}

// The link the app was opened with (seeded by Dart), and links the OS opens later.
const seed = (globalThis as any).__fuseHost as
  | { link?: string; restoration?: boolean; restore?: string | null }
  | undefined;
{
  const initial = seed?.link;
  if (initial && initial !== "/") pendingLink = initial;
  on("_link", (data: { link: string }) => openAppLink(data.link));
}

// ── Restore ─────────────────────────────────────────────────────────────
// When the OS keeps state (Android; iOS with a restoration id), the app's
// navigation is saved after every change, and the first root navigator puts
// it back when the OS starts the app again. That beats the launch link.

let pendingRestore: SavedStack | undefined;
try {
  if (seed?.restore) pendingRestore = JSON.parse(seed.restore);
} catch {
  pendingRestore = undefined;
}

let saveQueued = false;
function scheduleSave() {
  if (!seed?.restoration || saveQueued) return;
  saveQueued = true;
  queueMicrotask(() => {
    saveQueued = false;
    const root = [...roots].at(-1);
    if (root) send("_navSave", { stack: JSON.stringify(root.save()) });
  });
}

function makeTabs(routes: Route[]): TabsInternal {
  let current = 0;
  const [index, setIndex] = createSignal(0, { ownedWrite: true });
  const t: TabsInternal = {
    routes,
    navigators: [],
    index: () => (index(), current),
    _set: (i) => {
      current = i;
      setIndex(i);
      scheduleSave();
    },
    select: (i) => {
      if (i === current) t.navigators[i]?.popUntil();
      else t._set(i);
    },
  };
  return t;
}

const TabsContext = createContext<TabsState>();

/** The tabs of the tabs layout around this component: for its bar. */
export function useTabs(): TabsState {
  try {
    return useContext(TabsContext);
  } catch {
    throw new Error("useTabs must be called inside a tabs layout");
  }
}

let renderTabs: (tabs: TabsState) => JSX.Element = () => null as any;
export function _setTabsRenderer(fn: (tabs: TabsState) => JSX.Element) {
  renderTabs = fn;
}

// The layout's navigator, rendered as its `children`. Set by navigator.tsx
// so this module doesn't import JSX.
let renderLayout: (nav: NavigationController) => JSX.Element = () => null as any;
export function _setLayoutRenderer(fn: (nav: NavigationController) => JSX.Element) {
  renderLayout = fn;
}

// Solid 2 throws for a context nobody provides.
function outerNavigation(): NavigationController | undefined {
  try {
    return useContext(NavigationContext);
  } catch {
    return undefined;
  }
}

export function useNavigation(): NavigationController {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be called inside a <Navigator>");
  }
  return ctx;
}
