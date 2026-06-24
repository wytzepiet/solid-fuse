import {
  createContext,
  createSignal,
  untrack,
  useContext,
} from "solid-js";
import { materialPage } from "./pages/material";

/**
 * A page config — what `materialPage({...})`, `cupertinoPage({...})`, etc.
 * return. Just data: `type` names a Dart handle factory; `child` is the
 * page's JSX thunk; `props` are extra per-type options (name, duration, etc.)
 * that land on the FuseNode for the handle to read.
 */
export type PageConfig<P = any> = {
  type: string;
  child: () => JSX.Element;
  props: P;
};

/** An entry in the pages signal — config plus identity + pending resolver. */
export type PageEntry = {
  id: number;
  config: PageConfig;
  resolve: (value: any) => void;
  /**
   * True once a JS-initiated pop has started. The entry stays in the stack
   * (so its reactive root — and FuseNodes — stay alive), but the Dart
   * navigator omits it from its `pages:` list, so Flutter animates the route
   * out. The entry is only disposed when `onDidRemovePage` fires at the end
   * of that animation. Without this two-phase state, a reactive single-phase
   * list would dispose the node the instant it's logically popped — before
   * Flutter (or a hero-flight overlay) finishes rendering the exit.
   */
  popping?: boolean;
  /** Result to resolve the push-promise with once `onDidRemovePage` fires. */
  pendingResult?: unknown;
};

export type NavigationController = {
  /** Reactive page stack. Passed to `<For>` inside the Navigator wrapper. */
  pages: () => PageEntry[];
  /** Reactive stack depth — components can `nav.stackDepth() > 1`. */
  stackDepth: () => number;
  /**
   * Push a page and await its result.
   *
   * Resolves with the value from `pop(result)`. Resolves with `null` on
   * hardware back, swipe-back, `replaceAll`, `popUntil`, or controller
   * disposal — Flutter's `onDidRemovePage` doesn't carry a result value,
   * so only explicit `pop(result)` calls thread one through.
   */
  push: <T = unknown>(cfg: PageConfig | (() => JSX.Element)) => Promise<T | null>;
  /** Pop the top page with an optional result. No-op on single-entry stack. */
  pop: (result?: unknown) => void;
  pushReplacement: <T = unknown>(
    cfg: PageConfig | (() => JSX.Element),
    result?: unknown,
  ) => Promise<T | null>;
  /**
   * Pop until the named route is on top, or to the root if no name given.
   * If a name is given and no matching page is on the stack, this is a
   * no-op (with a dev warning) — it does NOT fall through to popping
   * everything.
   */
  popUntil: (name?: string) => void;
  /**
   * Replace the entire stack. Existing pages' push-promises resolve with
   * `null`. Returns a promise per new page — callers can ignore, destructure,
   * or `Promise.race` them. Refuses to empty the stack (use `popUntil()`
   * to pop to root).
   */
  replaceAll: (cfgs: PageConfig[]) => Promise<unknown>[];
  /**
   * Called by the Navigator widget when Flutter removes a page from the route
   * stack (hardware back, swipe, JS-initiated pop, or a declarative mid-stack
   * removal whose animation just completed). Resolves the removed entry's
   * push-promise and drops it from the *logical* stack — but keeps its node
   * alive (see `onRouteDisposed`). Safe to call with a stale id.
   */
  onDidRemovePage: (id: number) => void;
  /**
   * Called by the Navigator widget when the page's Flutter route is actually
   * disposed — after its exit transition and any shared-element flight have
   * finished and the route's content has left the tree. Only now is it safe to
   * drop the entry and dispose its FuseNodes. Safe to call with a stale id.
   */
  onRouteDisposed: (id: number) => void;
};

export const NavigationContext = createContext<NavigationController>();

/**
 * Create a navigation controller — pure JS state (a pages signal plus
 * imperative helpers). The actual Flutter Navigator is mounted by the
 * `<Navigator>` wrapper, which renders this controller's pages as JSX
 * children of a `<navigator>` intrinsic.
 *
 * If called inside a reactive owner, pending push-promises auto-resolve
 * with `null` when the owner disposes. Outside an owner, the caller is
 * responsible for lifecycle.
 */
export function createNavigationController(
  opts: { initialPage?: (() => JSX.Element) | PageConfig } = {},
): NavigationController {
  let nextId = 0;

  // Snapshot opts so users can pass reactive props without the Solid 2.0
  // "read outside tracking scope" warning. Nav config is set-once. A
  // function initialPage is sugar for `materialPage({ child: fn })`.
  const initialPage = untrack(() => {
    const ip = opts.initialPage;
    return typeof ip === "function"
      ? materialPage({ child: ip as () => JSX.Element })
      : ip;
  });

  // `ownedWrite: true` because setPages is also called from the onCleanup
  // below. Solid 2.0's reactive setup cascades disposal through
  // auto-disposed memos during initial render — even on a clean mount our
  // cleanup runs while a parent owner is still in scope, which the default
  // "no signal writes in owned scope" check flags. Every write in this
  // module (push, pop, popUntil, replaceAll, the cleanup) is intentional.
  const initial: PageEntry[] = initialPage
    ? [{ id: nextId++, config: initialPage, resolve: () => {} }]
    : [];
  const [pages, setPages] = createSignal<PageEntry[]>(initial, {
    ownedWrite: true,
  });

  function pushEntry<T>(cfg: PageConfig | (() => JSX.Element)): Promise<T | null> {
    const config = typeof cfg === "function" ? materialPage({ child: cfg }) : cfg;
    return new Promise<T | null>((resolve) => {
      const entry: PageEntry = {
        id: nextId++,
        config,
        resolve: resolve as (value: any) => void,
      };
      setPages((prev) => [...prev, entry]);
    });
  }

  // Drop the entry from the stack, disposing its FuseNodes. The push-promise
  // is resolved separately, in onDidRemovePage — by the time we get here it's
  // long settled. Called only once the page's route has actually disposed.
  function removeEntry(id: number) {
    setPages((prev) => prev.filter((e) => e.id !== id));
  }

  // Mark an entry as logically popped. It stays in the stack — keeping its
  // node alive — but the Dart navigator drops it, so Flutter animates the
  // route out. The real removeEntry (and promise resolution) is deferred to
  // onDidRemovePage when that animation completes. Replaces the entry object
  // (new identity, same id) so `<For keyed>`'s per-entry accessor updates and
  // the `_popping` prop re-threads. Already-popping entries are left alone.
  function markPopping(id: number, result: unknown) {
    setPages((prev) =>
      prev.map((e) =>
        e.id === id && !e.popping
          ? { ...e, popping: true, pendingResult: result }
          : e,
      ),
    );
  }

  /** Entries not yet animating out — the logical stack the user sees. */
  const liveEntries = () => pages().filter((e) => !e.popping);

  // No onCleanup tied to the current owner. Solid 2.0's reactive setup
  // cascades disposal through intermediate auto-disposed memos during the
  // initial render, which would fire our cleanup mid-mount, wipe the page
  // stack, and silently resolve pending push promises to null. The
  // runtime is short-lived (HMR restart / app close), so leaks aren't a
  // concern; if a future caller needs deterministic cleanup they can
  // expose dispose() explicitly.

  const nav: NavigationController = {
    pages,
    stackDepth: () => liveEntries().length,
    push: <T,>(cfg: PageConfig | (() => JSX.Element)) => pushEntry<T>(cfg),
    pop: (result) => {
      const live = liveEntries();
      if (live.length <= 1) {
        console.warn("[Fuse] nav.pop() ignored — cannot pop the root page");
        return;
      }
      markPopping(live[live.length - 1]!.id, result);
    },
    pushReplacement: <T,>(cfg: PageConfig | (() => JSX.Element), result?: unknown) => {
      const live = liveEntries();
      if (live.length > 0) {
        markPopping(live[live.length - 1]!.id, result);
      }
      return pushEntry<T>(cfg);
    },
    popUntil: (name) => {
      const live = liveEntries();
      if (name) {
        const idx = live.findLastIndex(
          (e) => (e.config.props as { name?: string }).name === name,
        );
        if (idx < 0) {
          console.warn(
            `[Fuse] nav.popUntil(${JSON.stringify(name)}) ignored — no page with that name on the stack`,
          );
          return;
        }
        for (const e of live.slice(idx + 1)) markPopping(e.id, null);
      } else {
        for (const e of live.slice(1)) markPopping(e.id, null);
      }
    },
    replaceAll: (cfgs) => {
      if (cfgs.length === 0) {
        console.warn(
          "[Fuse] nav.replaceAll([]) ignored — would leave the navigator empty",
        );
        return [];
      }
      for (const e of liveEntries()) markPopping(e.id, null);
      return cfgs.map((cfg) => pushEntry(cfg));
    },
    // Flutter removed the page from the route stack. Resolve the push-promise
    // (the logical pop is done) and make sure the entry is flagged popping — a
    // back gesture / swipe never went through markPopping, so flag it here to
    // drop it from Flutter's pages list. The node stays alive: it's only
    // disposed once the route itself disposes, in onRouteDisposed. For a
    // JS-initiated pop the result threaded through pop()/pushReplacement()
    // rides on pendingResult; any other removal carries none, so resolve null.
    onDidRemovePage: (id) => {
      const entry = pages().find((e) => e.id === id);
      if (!entry) return;
      entry.resolve(entry.popping ? entry.pendingResult : null);
      if (!entry.popping) markPopping(id, null);
    },
    // The route — and any exit flight it drove — is fully gone and its content
    // has left the tree. Now it's safe to drop the entry and dispose its nodes.
    onRouteDisposed: (id) => removeEntry(id),
  };

  return nav;
}

export function useNavigation(): NavigationController {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be called inside a <Navigator>");
  }
  return ctx;
}
