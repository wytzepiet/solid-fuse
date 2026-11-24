/**
 * Navigation state: one tree of stacks, plain JS data. A page entry can
 * hold stacks of its own, keyed by their first page's address; `<Navigator>`
 * only draws one of them. Placement, links and restore all work on the
 * data, so they don't wait for anything to render.
 */
import { createComponent, createContext, createSignal, getOwner, onCleanup, untrack, useContext } from "solid-js";
import { on, send } from "./channels";
import {
  addressOf,
  holdersOf,
  indexRoute,
  isRoute,
  matchAddress,
  normalize,
  paramNames,
  routeByKey,
  type Address,
  type PageType,
  type Route,
} from "./routes";

/**
 * A page config — what `page({...})`, `materialPage({...})`,
 * `cupertinoPage({...})`, etc. return. Just data: `type` names a Dart handle
 * factory; `child` is the page's JSX thunk; `props` are extra per-type
 * options that land on the FuseNode for the handle to read.
 */
export type PageConfig<P = any> = {
  type: string;
  child: () => JSX.Element;
  props: P;
};

/** A page on a stack. */
export type PageEntry = {
  readonly id: number;
  /** The page's route; none for a page pushed inline. */
  readonly route: Route | undefined;
  readonly params: Record<string, unknown>;
  /** Where a link finds it: `"/users/42"`. None for inline pages. */
  readonly address: string | undefined;
};

/** What a push can override. */
export type PushOptions = { page?: PageType };

type Pushable = PageConfig | (() => JSX.Element);

/** A route's params: optional when it takes none. */
type ParamsArg<P> = {} extends P ? [params?: P, options?: PushOptions] : [params: P, options?: PushOptions];

type PushFn = {
  <P, R>(route: Route<P, R>, ...args: ParamsArg<P>): Promise<R | null>;
  (address: Address, options?: PushOptions): Promise<unknown>;
  <T = unknown>(page: Pushable): Promise<T | null>;
};

/** One stack: its pages, oldest first. */
export type Stack = {
  /** Its first page's address: what `<Navigator index>` names. */
  readonly index: string;
  /** Reactive: the pages, oldest first. */
  pages(): PageEntry[];
  /** Reactive: the page on top. */
  top(): PageEntry;
  /** Push onto this stack, whatever the page's file says. */
  push: PushFn;
  /** Pop the top page with a result. On the first page, this closes the page holding the stack. */
  pop(result?: unknown): void;
  /** Replace every page above the first one. `set([])` goes back to the first page. */
  set(pages: (Address | Route)[]): void;
};

/** What `useNav()` gives a page. */
export type Nav = {
  /**
   * Open a page where its file says (the stack its folder's page holds),
   * or push an inline page on the stack you're on. Resolves with what the
   * page gives to `pop(result)`, or `null` when it goes any other way.
   */
  push: PushFn;
  /** Pop the top of the stack you're on. On its first page, this closes the page holding it. */
  pop(result?: unknown): void;
  /** Swap the page on top of your stack for another. */
  replace: PushFn;
  /** Open an address as a link does: the stacks on its way go back to their first page. */
  go(address: Address): void;
  /** The stack this page is on. */
  readonly stack: Stack;
  /** The app's own stack. */
  readonly app: Stack;
};

/** What `usePage()` gives a page: its own place in the tree. */
export type Page = PageEntry & {
  /** A stack this page holds, by its first page's address; the first one without. */
  stack(index?: string): Stack;
  /** Reactive: the indexes of the stacks it holds, in the order they mounted. */
  stacks(): string[];
  /** Reactive: the stack in front (the shown tab, the side you used last). */
  active(): string | undefined;
  /** Bring a stack to the front. The one in front again goes back to its first page. */
  show(index: string): void;
};

// ── State ───────────────────────────────────────────────────────────────

type Entry = PageEntry & {
  stack: StackState;
  content: Pushable | undefined;
  pageType: PageType | undefined;
  resolve: (v: unknown) => void;
  promise: Promise<unknown>;
  holder: Holder;
  gone: boolean;
};

type Holder = {
  route: Route | undefined;
  params: Record<string, unknown>;
  entry: Entry | undefined;
  stacks: Map<string, StackState>;
  /** Mounted or restored stacks, in order. */
  order: string[];
  setOrder: (v: string[]) => void;
  readOrder: () => string[];
  active: string | undefined;
  setActive: (v: string | undefined) => void;
  readActive: () => string | undefined;
};

type StackState = {
  key: string;
  holder: Holder;
  list: Entry[];
  read: () => Entry[];
  write: (v: Entry[]) => void;
  mounted: number;
};

let nextId = 0;
// Every entry that's on a stack.
const live = new Set<Entry>();

function makeHolder(route: Route | undefined, params: Record<string, unknown>, entry?: Entry): Holder {
  const [order, setOrder] = createSignal<string[]>([], { ownedWrite: true });
  const [active, setActive] = createSignal<string | undefined>(undefined, { ownedWrite: true });
  const h: Holder = {
    route,
    params,
    entry,
    stacks: new Map(),
    order: [],
    setOrder: (v) => {
      h.order = v;
      setOrder(v);
    },
    readOrder: () => (order(), h.order),
    active: undefined,
    setActive: (v) => {
      h.active = v;
      setActive(v);
    },
    readActive: () => (active(), h.active),
  };
  return h;
}

const app: Holder = makeHolder(undefined, {});

function holderPath(h: Holder): string {
  return h.route?.path ?? "/";
}

function stackOf(h: Holder, key: string): StackState {
  let s = h.stacks.get(key);
  if (s) return s;
  const [sig, setSig] = createSignal<Entry[]>([], { ownedWrite: true });
  // `list` is what's current: Solid shows a write after a flush, and one
  // push builds on the one before it in the same tick.
  const st: StackState = {
    key,
    holder: h,
    list: [],
    read: () => (sig(), st.list),
    write: (v) => {
      st.list = v;
      setSig(v);
      scheduleSave();
    },
    mounted: 0,
  };
  h.stacks.set(key, st);
  if (!h.order.includes(key)) h.setOrder([...h.order, key]);
  return st;
}

function pick(params: Record<string, unknown>, names: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of names) if (k in params) out[k] = params[k];
  return out;
}

function sameParams(r: Route, a: Record<string, unknown>, b: Record<string, unknown>) {
  return paramNames(r.path).every((k) => String(a[k]) === String(b[k]));
}

function makeEntry(
  stack: StackState,
  target: Route | Pushable,
  params: Record<string, unknown>,
  options?: PushOptions,
): Entry {
  let resolve!: (v: unknown) => void;
  const promise = new Promise<unknown>((r) => (resolve = r));
  const r = isRoute(target) ? target : undefined;
  const e = {
    id: nextId++,
    route: r,
    params,
    address: r?.path !== undefined ? safeAddress(r, params) : undefined,
    stack,
    content: r ? undefined : (target as Pushable),
    pageType: options?.page,
    resolve,
    promise,
    gone: false,
  } as Entry;
  e.holder = makeHolder(r, params, e);
  return e;
}

function safeAddress(r: Route, params: Record<string, unknown>) {
  try {
    return addressOf(r, params);
  } catch {
    return undefined;
  }
}

function add(stack: StackState, target: Route | Pushable, params: Record<string, unknown>, options?: PushOptions): Entry {
  ensureIndex(stack);
  const e = makeEntry(stack, target, params, options);
  live.add(e);
  stack.write([...stack.list, e]);
  return e;
}

/** A stack's first page, when it has none yet. */
function ensureIndex(stack: StackState) {
  if (stack.list.length) return;
  const h = stack.holder;
  const r = indexRoute(h.route, stack.key);
  if (!r) {
    console.warn(`[Fuse] no page at ${stack.key} for a stack to start on`);
    return;
  }
  const e = makeEntry(stack, r, { ...h.params, ...paramsAt(r, stack.key) });
  live.add(e);
  stack.write([e]);
}

/** The params an address gives a pattern: `/u/:name` at `/u/ada` is `{ name: "ada" }`. */
function paramsAt(r: Route, address: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = (r.path ?? "").split("/").filter(Boolean);
  const a = address.split("/").filter(Boolean);
  p.forEach((s, i) => {
    if (s.startsWith(":") && a[i] !== undefined && !a[i]!.startsWith(":")) out[s.slice(1)] = decodeURIComponent(a[i]!);
  });
  return out;
}

function drop(entries: Entry[], result: unknown) {
  for (const e of entries) {
    e.gone = true;
    live.delete(e);
    // What it holds stays: it may still be drawing on its way out.
    forEachInside(e, (inner) => {
      inner.gone = true;
      live.delete(inner);
      inner.resolve(null);
    });
    e.resolve(result);
  }
}

function forEachInside(e: Entry, fn: (inner: Entry) => void) {
  for (const s of e.holder.stacks.values())
    for (const inner of s.list) {
      forEachInside(inner, fn);
      fn(inner);
    }
}

function removeIds(stack: StackState, ids: Set<number>, result: unknown) {
  const removed = stack.list.filter((e) => ids.has(e.id));
  if (!removed.length) return;
  stack.write(stack.list.filter((e) => !ids.has(e.id)));
  drop(removed, result);
}

function truncate(stack: StackState, keep: number) {
  const removed = stack.list.slice(keep);
  if (!removed.length) return;
  stack.write(stack.list.slice(0, keep));
  drop(removed, null);
}

// ── Where pages go ──────────────────────────────────────────────────────

/** Is this page on screen: on top of a stack that is in front, all the way up? */
function onScreen(e: Entry): boolean {
  return !e.gone && e.stack.list.at(-1) === e && inFront(e.stack);
}

function inFront(s: StackState): boolean {
  const h = s.holder;
  if (h.active !== undefined && h.active !== s.key) return false;
  return h.entry ? onScreen(h.entry) : true;
}

/** Bring a stack to the front, and the stacks around it. */
function reveal(s: StackState) {
  if (s.holder.active !== s.key) s.holder.setActive(s.key);
  scheduleSave();
  if (s.holder.entry) reveal(s.holder.entry.stack);
}

/**
 * Which of a holder's stacks a page opens in: the one it's the first page
 * of; else the one whose first page's address its own starts with (not the
 * holder's own, which would take everything); else the one in front.
 * Undefined while the holder has no stacks.
 */
function chooseStack(h: Holder, r: Route): string | undefined {
  const keys = h.order;
  if (!keys.length) return undefined;
  for (const k of keys) if (indexRoute(h.route, k) === r) return k;
  const path = r.path;
  if (path !== undefined) {
    let best: string | undefined;
    for (const k of keys) {
      if (k === holderPath(h)) continue;
      if (startsWithPattern(path, k) && (!best || k.length > best.length)) best = k;
    }
    if (best) return best;
  }
  return h.active !== undefined && keys.includes(h.active) ? h.active : keys[0];
}

function startsWithPattern(path: string, prefix: string): boolean {
  const a = path.split("/").filter(Boolean);
  const b = prefix.split("/").filter(Boolean);
  return a.length > b.length && b.every((s, i) => s === a[i] || s.startsWith(":") || a[i]!.startsWith(":"));
}

/** The open holder for a route: the one around `from` first, then one on screen, then any. */
function findHolder(r: Route, params: Record<string, unknown>, from: Entry | undefined): Holder | undefined {
  for (let e = from; e; e = e.stack.holder.entry) if (e.route === r && sameParams(r, e.params, params)) return e.holder;
  let any: Entry | undefined;
  for (const e of live) {
    if (e.route !== r || !sameParams(r, e.params, params)) continue;
    if (onScreen(e) || [...e.holder.stacks.values()].some((s) => s.list.some(onScreen))) return e.holder;
    any = e;
  }
  return any?.holder;
}

type Attempt = { done: true; promise: Promise<unknown> } | { done: false };

/**
 * Open a page where it belongs, now if its holder has stacks, else not yet.
 * A holder that isn't open opens first. A holder under another page (DMs
 * over the tabs) is covered: the page goes over the cover instead, where
 * it can be seen.
 */
function tryPush(r: Route, params: Record<string, unknown>, options: PushOptions | undefined, from: Entry | undefined): Attempt {
  let h: Holder = app;
  if (r.in) {
    const found = findHolder(r.in, params, from);
    const cover = found?.entry && coverOf(found.entry);
    if (cover) return { done: true, promise: add(cover, r, params, options).promise };
    if (found) h = found;
    else {
      const opened = tryPush(r.in, pick(params, paramNames(r.in.path)), undefined, from);
      if (!opened.done) return opened;
      const e = [...live].findLast((x) => x.route === r.in && sameParams(r.in!, x.params, params));
      if (!e) return { done: false };
      h = e.holder;
    }
  }
  const key = chooseStack(h, r);
  if (key === undefined) return { done: false };
  const s = stackOf(h, key);
  ensureIndex(s);
  reveal(s);
  if (indexRoute(h.route, key) === r) return { done: true, promise: Promise.resolve(null) };
  return { done: true, promise: add(s, r, params, options).promise };
}

/**
 * The stack where something covers this page (or a page around it), or
 * nothing when it isn't covered. A hidden tab isn't covered: it can be shown.
 */
function coverOf(e: Entry): StackState | undefined {
  for (let x: Entry | undefined = e; x; x = x.stack.holder.entry) {
    if (x.stack.list.at(-1) !== x) return x.stack;
  }
  return undefined;
}

// Pushes and links waiting for a holder's stacks to mount.
type Waiting = { run: (fallback: boolean) => boolean; link: boolean };
let waiting: Waiting[] = [];
let retryQueued = false;

function wait(w: Waiting) {
  if (w.link) waiting = waiting.filter((x) => !x.link);
  waiting.push(w);
  queueRetry();
}

function queueRetry() {
  if (retryQueued) return;
  retryQueued = true;
  queueMicrotask(() => {
    retryQueued = false;
    retry();
  });
}

function retry() {
  waiting = waiting.filter((w) => !w.run(true));
}

function push(r: Route, params: Record<string, unknown>, options: PushOptions | undefined, from: Entry | undefined): Promise<unknown> {
  const now = tryPush(r, params, options, from);
  if (now.done) return now.promise;
  let resolve!: (v: unknown) => void;
  const promise = new Promise<unknown>((res) => (resolve = res));
  wait({
    link: false,
    run: () => {
      const a = tryPush(r, params, options, from);
      if (a.done) a.promise.then(resolve);
      return a.done;
    },
  });
  return promise;
}

// ── Links ───────────────────────────────────────────────────────────────

/**
 * Open an address as a link: every holder on the way opens (outermost
 * first) and its stack goes back to its first page; then the pages whose
 * addresses lead up to it open below it, so back goes up the hierarchy.
 */
function tryLink(r: Route, params: Record<string, unknown>): boolean {
  let h: Holder = app;
  for (const holderRoute of [...holdersOf(r), r]) {
    const last = holderRoute === r;
    const key = chooseStack(h, holderRoute);
    if (key === undefined) return false;
    const s = stackOf(h, key);
    ensureIndex(s);
    reveal(s);
    const own = last ? params : pick(params, paramNames(holderRoute.path));
    const first = s.list[0];
    if (first?.route === holderRoute && sameParams(holderRoute, first.params, own)) {
      truncate(s, 1);
      h = first.holder;
      continue;
    }
    const second = s.list[1];
    if (!last && second?.route === holderRoute && sameParams(holderRoute, second.params, own)) {
      truncate(s, 2);
      h = second.holder;
      continue;
    }
    truncate(s, 1);
    if (last) for (const [pr, pp] of between(h, key, r, params)) add(s, pr, pp);
    h = add(s, holderRoute, own).holder;
  }
  return true;
}

/** The pages between a stack's first page and `r`: real pages at the addresses leading to it, in the same stack. */
function between(h: Holder, key: string, r: Route, params: Record<string, unknown>): [Route, Record<string, unknown>][] {
  const address = safeAddress(r, params);
  if (!address) return [];
  const out: [Route, Record<string, unknown>][] = [];
  const parts = address.split("/").filter(Boolean);
  const from = key.split("/").filter(Boolean).length + 1;
  for (let n = Math.max(1, from); n < parts.length; n++) {
    const m = matchAddress("/" + parts.slice(0, n).join("/"));
    if (!m || m.route === r || m.route.in !== h.route) continue;
    if (chooseStack(h, m.route) !== key || indexRoute(h.route, key) === m.route) continue;
    out.push([m.route, m.params]);
  }
  return out;
}

function openLink(address: string) {
  const m = matchAddress(address);
  if (!m) {
    console.warn(`[Fuse] no page at ${JSON.stringify(address)}`);
    return;
  }
  if (tryLink(m.route, m.params)) {
    waiting = waiting.filter((w) => !w.link);
    return;
  }
  wait({ link: true, run: () => tryLink(m.route, m.params) });
}

/** Open a link: what Dart calls when the OS opens one. */
export function openAppLink(address: string) {
  if (!started) pendingLink = address;
  else openLink(address);
}

// ── Stacks as the renderer sees them ────────────────────────────────────

export const PageContext = createContext<Entry | undefined>(undefined);

let inPage: { e: Entry | undefined } | undefined;

/** For tests: run as if inside this page. */
export function _inPage<T>(e: PageEntry | undefined, fn: () => T): T {
  const prev = inPage;
  inPage = { e: e as Entry | undefined };
  try {
    return fn();
  } finally {
    inPage = prev;
  }
}

function currentEntry(): Entry | undefined {
  if (inPage) return inPage.e;
  if (!getOwner()) return undefined;
  try {
    return useContext(PageContext);
  } catch {
    return undefined;
  }
}

let started = false;
let pendingLink: string | undefined;

/** The first app stack to mount puts back what was saved, or opens the launch link. */
function start() {
  if (started) return;
  started = true;
  if (pendingRestore) {
    const saved = pendingRestore;
    pendingRestore = undefined;
    pendingLink = undefined;
    restoreHolder(app, saved);
  }
  if (pendingLink !== undefined) {
    const link = pendingLink;
    pendingLink = undefined;
    queueMicrotask(() => openLink(link));
  }
}

export type MountedStack = Stack & {
  /** Reactive: whether this stack takes the back button (it's in front in its holder). */
  takesBack(): boolean;
  /** The renderer's view of the entries. */
  entries(): Entry[];
  /** Flutter removed a page (back, swipe). */
  removed(id: number): void;
};

/**
 * Register a stack of the page this runs in (the app's, outside any page)
 * and get it. Draw its pages however you like: `<Navigator>` draws them. The stack's pages stay when it unmounts; pushes into
 * a holder with no stacks wait until one mounts.
 */
export function createStack(options: { index?: string } = {}): MountedStack {
  const entry = currentEntry();
  const h = entry ? entry.holder : app;
  if (h === app) start();
  const key = normalize(untrack(() => options.index) ?? holderPath(h));
  const s = stackOf(h, key);
  s.mounted++;
  if (h.active === undefined) h.setActive(key);
  ensureIndex(s);
  if (getOwner()) onCleanup(() => s.mounted--);
  queueRetry();
  return {
    ...stackHandle(s),
    takesBack: () => h.readActive() === key,
    entries: s.read,
    removed: (id) => removeIds(s, new Set([id]), null),
  };
}

function resolveTarget(target: unknown, params?: unknown, options?: PushOptions) {
  if (typeof target === "string") {
    const m = matchAddress(target);
    if (!m) throw new Error(`[Fuse] no page at ${JSON.stringify(target)}`);
    return { route: m.route, params: m.params, options: params as PushOptions | undefined };
  }
  if (isRoute(target)) return { route: target, params: (params as Record<string, unknown>) ?? {}, options };
  return undefined;
}

function stackHandle(s: StackState): Stack {
  const pages = () => s.read() as PageEntry[];
  return {
    index: s.key,
    pages,
    top: () => pages().at(-1)!,
    push: ((target: unknown, params?: unknown, options?: PushOptions) => {
      const t = resolveTarget(target, params, options);
      if (!t) return add(s, target as Pushable, {}).promise;
      reveal(s);
      return add(s, t.route, t.params, t.options).promise;
    }) as PushFn,
    pop: (result) => pop(s, result),
    set: (targets) => {
      truncate(s, 1);
      ensureIndex(s);
      for (const t of targets) {
        const r = resolveTarget(t)!;
        add(s, r.route, r.params);
      }
    },
  };
}

function pop(s: StackState, result: unknown) {
  if (s.list.length > 1) {
    removeIds(s, new Set([s.list.at(-1)!.id]), result);
    return;
  }
  const holder = s.holder.entry;
  if (holder && holder.stack.list.length > 1 && !holder.gone) {
    removeIds(holder.stack, new Set([holder.id]), result);
    return;
  }
  if (holder) pop(holder.stack, result);
  else console.warn("[Fuse] pop() ignored: this is the app's first page");
}

function navFor(e: Entry | undefined): Nav {
  const here = () => e?.stack ?? appStack();
  return {
    push: ((target: unknown, params?: unknown, options?: PushOptions) => {
      const t = resolveTarget(target, params, options);
      if (!t) return add(here(), target as Pushable, {}).promise;
      return push(t.route, t.params, t.options, e);
    }) as PushFn,
    pop: (result) => pop(here(), result),
    replace: ((target: unknown, params?: unknown, options?: PushOptions) => {
      const s = here();
      if (s.list.length > 1) removeIds(s, new Set([s.list.at(-1)!.id]), null);
      const t = resolveTarget(target, params, options);
      if (!t) return add(s, target as Pushable, {}).promise;
      return push(t.route, t.params, t.options, e);
    }) as PushFn,
    go: (address) => openLink(address as string),
    get stack() {
      return stackHandle(here());
    },
    get app() {
      return stackHandle(appStack());
    },
  };
}

function appStack(): StackState {
  return stackOf(app, app.active ?? app.order[0] ?? "/");
}

/** Navigation for this page: push, pop, links, and the stack it's on. */
export function useNav(): Nav {
  return navFor(currentEntry());
}

/** This page's own place in the tree: the stacks it holds. */
export function usePage(): Page {
  const e = currentEntry();
  const h = e?.holder ?? app;
  return {
    id: e?.id ?? -1,
    route: e?.route,
    params: e?.params ?? {},
    address: e?.address,
    stack: (index) => {
      const key = index !== undefined ? normalize(index) : (h.order[0] ?? holderPath(h));
      return stackHandle(stackOf(h, key));
    },
    stacks: h.readOrder,
    active: h.readActive,
    show: (index) => {
      const key = normalize(index);
      const s = stackOf(h, key);
      ensureIndex(s);
      if (h.active === key) truncate(s, 1);
      else reveal(s);
    },
  };
}

/** The renderer turns an entry into its page. */
export function pageConfigOf(e: PageEntry, fallback: PageType, wrap: (e: PageEntry, child: () => JSX.Element) => JSX.Element): PageConfig {
  const entry = e as Entry;
  const c = entry.content;
  if (c && typeof c === "object") return { ...c, child: () => wrap(e, c.child) };
  const child = c ? (c as () => JSX.Element) : () => createComponent(entry.route!.component as any, entry.params);
  const type = entry.pageType ?? entry.route?.page ?? fallback;
  return type(() => wrap(e, child));
}

// ── Restore ─────────────────────────────────────────────────────────────
// When the OS keeps state (Android; iOS with a restoration id), the tree is
// saved after every change, and the first app stack puts it back when the
// OS starts the app again. That beats the launch link.

/** A saved holder: its stacks by first page, and the one in front. Plain JSON. */
export type SavedHolder = { s?: Record<string, SavedEntry[]>; a?: string };
/** A saved page: its route's key and params, and what it holds. */
export type SavedEntry = SavedHolder & { r: string; p?: Record<string, unknown> };

function saveHolder(h: Holder): SavedHolder {
  const out: SavedHolder = {};
  for (const [key, s] of h.stacks) {
    const list: SavedEntry[] = [];
    for (const e of s.list) {
      // Inline pages (and what's above them) don't come back.
      if (!e.route || e.route.key === undefined || !jsonSafe(e.params)) break;
      const se: SavedEntry = { r: e.route.key, ...saveHolder(e.holder) };
      if (Object.keys(e.params).length) se.p = e.params;
      list.push(se);
    }
    if (list.length) (out.s ??= {})[key] = list;
  }
  if (h.active !== undefined && out.s) out.a = h.active;
  return out;
}

function restoreHolder(h: Holder, saved: SavedHolder) {
  for (const [key, list] of Object.entries(saved.s ?? {})) {
    const s = stackOf(h, key);
    const entries: Entry[] = [];
    for (const se of list) {
      const r = routeByKey(se.r);
      if (!r) break;
      const e = makeEntry(s, r, se.p ?? {});
      live.add(e);
      entries.push(e);
      restoreHolder(e.holder, se);
    }
    s.list = entries;
    s.write(entries);
  }
  if (saved.a !== undefined) h.setActive(saved.a);
}

/** The whole tree as JSON: what restore saves. */
export function saveNavigation(): SavedHolder {
  return saveHolder(app);
}

function jsonSafe(v: unknown): boolean {
  try {
    return JSON.stringify(JSON.parse(JSON.stringify(v ?? {}))) === JSON.stringify(v ?? {});
  } catch {
    return false;
  }
}

const seed = (globalThis as any).__fuseHost as { link?: string; restoration?: boolean; restore?: string | null } | undefined;

let pendingRestore: SavedHolder | undefined;
try {
  const parsed = seed?.restore ? JSON.parse(seed.restore) : undefined;
  // A save from before the tree (a plain list) doesn't come back.
  if (parsed && !Array.isArray(parsed) && typeof parsed === "object") pendingRestore = parsed;
} catch {
  pendingRestore = undefined;
}
{
  const initial = seed?.link;
  if (initial && initial !== "/") pendingLink = initial;
  on("_link", (data: { link: string }) => openAppLink(data.link));
}

let saveQueued = false;
function scheduleSave() {
  if (!seed?.restoration || saveQueued) return;
  saveQueued = true;
  queueMicrotask(() => {
    saveQueued = false;
    send("_navSave", { stack: JSON.stringify(saveNavigation()) });
  });
}

/** For tests: forget the whole tree. */
export function _resetNavigation() {
  for (const e of live) e.resolve(null);
  live.clear();
  app.stacks.clear();
  app.setOrder([]);
  app.setActive(undefined);
  waiting = [];
  started = false;
  pendingLink = undefined;
  pendingRestore = undefined;
}

/** For tests: put back a saved tree, as a cold start would. */
export function _restoreNavigation(saved: SavedHolder) {
  pendingRestore = saved;
}
