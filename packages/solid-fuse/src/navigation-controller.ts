import {
  createContext,
  createStore,
  snapshot,
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
  /**
   * Reactive page stack — a store proxy. Passed straight to
   * `<For each={nav.pages}>` inside the Navigator wrapper. Entries are stable
   * proxies, so `popping` flips in place (property-level tracking) without
   * re-rendering the row.
   */
  pages: readonly PageEntry[];
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
   * Fire the removal of a page that Flutter has finished tearing down.
   * Primarily called from the page content's `State.dispose()` (via the
   * `_onDisposed` callback), which fires when Flutter destroys the route's
   * element subtree — for *every* removal path, app-initiated (declarative
   * `pages:` omission via `pop()`) or Flutter-initiated (hardware back, swipe,
   * route self-pop). The Dart navigator's `onDidRemovePage` hook may also call
   * this redundantly for Flutter-initiated pops. Resolves the removed entry's
   * push-promise and drops it from the stack — disposing its node. Id-keyed
   * and idempotent: a stale id (already-removed entry) is a harmless no-op, so
   * racing trigger paths are safe.
   */
  onDidRemovePage: (id: number) => void;
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

  // A draft-first store (Solid 2.0): popping flips one field on one entry in
  // place (`e.popping = true`), so property-level tracking re-runs only the
  // `_popping` binding — the row's never-mutated `config` is built once by
  // construction. `<For keyed={(e) => e.id}>` still reconciles by id (stable
  // identity through markPopping, correct for mid-stack removal), but the flag
  // now re-threads through the entry proxy instead of by replacing the entry
  // object — so the old identity-swap hack is gone.
  //
  // The old signal carried `{ ownedWrite: true }` so a now-removed onCleanup
  // could write during the disposal cascade Solid runs through auto-disposed
  // memos on initial render (the default "no writes in an owned scope" guard
  // flags that). Plain `createStore` has no such option — and doesn't need
  // one: store setters route writes through internal data nodes inside an
  // untracked scope, and every write here (push, pop, markPopping,
  // removeEntry) fires from an event/bridge callback outside any owned scope,
  // so none trip the guard.
  const initial: PageEntry[] = initialPage
    ? [{ id: nextId++, config: initialPage, resolve: () => {} }]
    : [];
  const [pages, setPages] = createStore<PageEntry[]>(initial);

  function pushEntry<T>(cfg: PageConfig | (() => JSX.Element)): Promise<T | null> {
    const config = typeof cfg === "function" ? materialPage({ child: cfg }) : cfg;
    return new Promise<T | null>((resolve) => {
      const entry: PageEntry = {
        id: nextId++,
        config,
        resolve: resolve as (value: any) => void,
      };
      setPages((p) => {
        p.push(entry);
      });
    });
  }

  // Drop the entry from the stack, disposing its FuseNodes. The push-promise
  // is resolved separately, in onDidRemovePage — by the time we get here (one
  // vsync later) it's long settled. id-keyed, so a stale id is a harmless no-op.
  function removeEntry(id: number) {
    setPages((p) => p.filter((e) => e.id !== id));
  }

  // Mark an entry as logically popped. It stays in the stack — keeping its
  // node alive — but the Dart navigator drops it, so Flutter animates the
  // route out. The real removeEntry (and promise resolution) is deferred to
  // onDidRemovePage when that animation completes. Flips `popping` in place on
  // the entry; property-level store tracking re-runs only the `_popping`
  // binding, leaving the row's config untouched. Already-popping entries are
  // left alone.
  function markPopping(id: number, result: unknown) {
    setPages((p) => {
      const e = p.find((e) => e.id === id);
      if (e && !e.popping) {
        e.popping = true;
        e.pendingResult = result;
      }
    });
  }

  /** Entries not yet animating out — the logical stack the user sees. */
  const liveEntries = () => pages.filter((e) => !e.popping);

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
    // Flutter has finished tearing down the page's route subtree (the page
    // content's State.dispose() fired, deferred one microtask so we don't
    // re-enter disposal mid-teardown). Resolve the push-promise and remove the
    // entry — disposing its node. Triggering off content disposal rather than
    // Navigator.onDidRemovePage is what makes this fire for app-initiated pops
    // too (nav.pop() → declarative `pages:` omission), which Flutter's hook
    // skips — previously leaking the popped node forever on iOS, keeping e.g. a
    // video controller alive and audible. For a JS-initiated pop the result
    // threaded through pop()/pushReplacement() rides on pendingResult; any
    // other removal carries none, so resolve null.
    onDidRemovePage: (id) => {
      const entry = pages.find((e) => e.id === id);
      if (!entry) return;
      // `pendingResult` lives in the store, so a non-primitive result reads
      // back as a proxy — snapshot() unwraps it to the original reference the
      // caller passed to pop()/pushReplacement() (primitives pass through).
      entry.resolve(entry.popping ? snapshot(entry.pendingResult) : null);
      removeEntry(id);
    },
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
