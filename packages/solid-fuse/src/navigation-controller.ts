import {
  createContext,
  createSignal,
  getOwner,
  onCleanup,
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
  cfg: PageConfig;
  resolve: (value: any) => void;
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
  push: <T = unknown>(cfg: PageConfig) => Promise<T | null>;
  /** Pop the top page with an optional result. No-op on single-entry stack. */
  pop: (result?: unknown) => void;
  pushReplacement: <T = unknown>(
    cfg: PageConfig,
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
   * Called by the Navigator widget when Flutter removes a page (hardware
   * back, swipe, or a declarative mid-stack removal whose animation just
   * completed). Resolves the removed entry's push-promise with `null` and
   * drops it from the stack. Safe to call with a stale id — unknown ids
   * are no-ops.
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

  // Seed the signal with the initial page (if any). We can't call `setPages`
  // here — Solid 2.0 forbids signal writes during render, and this factory
  // typically runs inside the <Navigator> wrapper's body.
  const initial: PageEntry[] = initialPage
    ? [{ id: nextId++, cfg: initialPage, resolve: () => {} }]
    : [];
  const [pages, setPages] = createSignal<PageEntry[]>(initial);

  function pushEntry<T>(cfg: PageConfig): Promise<T | null> {
    return new Promise<T | null>((resolve) => {
      const entry: PageEntry = {
        id: nextId++,
        cfg,
        resolve: resolve as (value: any) => void,
      };
      setPages((prev) => [...prev, entry]);
    });
  }

  function removeEntry(id: number, result: unknown) {
    let removed: PageEntry | undefined;
    setPages((prev) =>
      prev.filter((e) => {
        if (e.id === id) {
          removed = e;
          return false;
        }
        return true;
      }),
    );
    removed?.resolve(result);
  }

  if (getOwner()) {
    onCleanup(() => {
      for (const e of pages()) e.resolve(null);
      setPages([]);
    });
  }

  const nav: NavigationController = {
    pages,
    stackDepth: () => pages().length,
    push: <T,>(cfg: PageConfig) => pushEntry<T>(cfg),
    pop: (result) => {
      const current = pages();
      if (current.length <= 1) {
        console.warn("[Fuse] nav.pop() ignored — cannot pop the root page");
        return;
      }
      removeEntry(current[current.length - 1]!.id, result);
    },
    pushReplacement: <T,>(cfg: PageConfig, result?: unknown) => {
      const current = pages();
      if (current.length > 0) {
        removeEntry(current[current.length - 1]!.id, result);
      }
      return pushEntry<T>(cfg);
    },
    popUntil: (name) => {
      const current = pages();
      if (name) {
        const idx = current.findLastIndex(
          (e) => (e.cfg.props as { name?: string }).name === name,
        );
        if (idx < 0) {
          console.warn(
            `[Fuse] nav.popUntil(${JSON.stringify(name)}) ignored — no page with that name on the stack`,
          );
          return;
        }
        const drop = current.slice(idx + 1);
        setPages(current.slice(0, idx + 1));
        for (const e of drop) e.resolve(null);
      } else {
        const drop = current.slice(1);
        setPages(current.slice(0, 1));
        for (const e of drop) e.resolve(null);
      }
    },
    replaceAll: (cfgs) => {
      if (cfgs.length === 0) {
        console.warn(
          "[Fuse] nav.replaceAll([]) ignored — would leave the navigator empty",
        );
        return [];
      }
      const current = pages();
      setPages([]);
      for (const e of current) e.resolve(null);
      return cfgs.map((cfg) => pushEntry(cfg));
    },
    onDidRemovePage: (id) => removeEntry(id, null),
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
