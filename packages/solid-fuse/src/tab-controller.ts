import { createSignal, getOwner, onCleanup } from "solid-js";
import { FuseHandle } from "./handle";

export class TabController extends FuseHandle<"tabController"> {
  /** The selected tab as a reactive signal — read it in an effect to react
   *  to swipes and taps. */
  readonly index: () => number;

  /** Total number of tabs (fixed at creation, mirrors Flutter). */
  readonly length: number;

  constructor(opts: { length: number; initialIndex?: number }) {
    const [index, setIndex] = createSignal(opts.initialIndex ?? 0);
    super("tabController", {
      length: opts.length,
      initialIndex: opts.initialIndex ?? 0,
      setIndex,
    });
    this.index = index;
    this.length = opts.length;
  }

  /** Animate to a tab, as a tap does. */
  animateTo(index: number, opts?: { duration?: number }) {
    return this.call("animateTo", { index, ...opts });
  }

  /** Switch to a tab immediately, no animation. */
  jumpTo(index: number) {
    return this.call("jumpTo", index);
  }
}

/**
 * Create a tab controller — a persistent Dart-side [TabController] that a
 * `<TabBar>` and `<TabBarView>` share by both taking `controller={...}`.
 * Keeps the strip and the pages in sync, and exposes the selected `index()`
 * plus programmatic `animateTo` / `jumpTo`.
 *
 * Created inside a reactive owner it auto-disposes on cleanup; otherwise (or
 * with `new TabController(...)`) call `dispose()` yourself. For the
 * no-programmatic-control case, prefer `<DefaultTabController>`, which wires
 * the controller through context.
 */
export function createTabController(opts: {
  length: number;
  initialIndex?: number;
}): TabController {
  const controller = new TabController(opts);
  if (getOwner()) onCleanup(() => controller.dispose());
  return controller;
}
