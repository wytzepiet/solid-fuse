import { createSignal } from "solid-js";
import { createHandle, type Handle } from "./handle";

export type TabController = Handle<"tabController"> & {
  /** The selected tab as a reactive signal — read it in an effect to react
   *  to swipes and taps. */
  index: () => number;
  /** Total number of tabs (fixed at creation, mirrors Flutter). */
  length: number;
  /** Animate to a tab, as a tap does. */
  animateTo: (index: number, opts?: { duration?: number }) => void;
  /** Switch to a tab immediately, no animation. */
  jumpTo: (index: number) => void;
  dispose: () => void;
};

/**
 * Create a tab controller — a persistent Dart-side [TabController] that a
 * `<TabBar>` and `<TabBarView>` share by both taking `controller={...}`.
 * Keeps the strip and the pages in sync, and exposes the selected `index()`
 * plus programmatic `animateTo` / `jumpTo`.
 *
 * Created inside a reactive owner it auto-disposes on cleanup; otherwise call
 * `dispose()` yourself. For the no-programmatic-control case, prefer
 * `<DefaultTabController>`, which wires the controller through context.
 */
export function createTabController(opts: {
  length: number;
  initialIndex?: number;
}): TabController {
  const [index, setIndex] = createSignal(opts.initialIndex ?? 0);
  const { node, call, dispose } = createHandle("tabController", {
    length: opts.length,
    initialIndex: opts.initialIndex ?? 0,
    setIndex,
  });
  return {
    node,
    index,
    length: opts.length,
    animateTo: (index, o) => call("animateTo", { index, ...o }),
    jumpTo: (index) => call("jumpTo", index),
    dispose,
  };
}
