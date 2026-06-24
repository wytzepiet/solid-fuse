import { createSignal, getOwner, onCleanup } from "solid-js";
import { FuseHandle } from "./handle";

export class ScrollController extends FuseHandle<"scrollController"> {
  /** Reactive signal — current scroll position, updates as the user scrolls. */
  readonly scrollOffset: () => number;

  constructor(opts: { initialScrollOffset?: number } = {}) {
    const [scrollOffset, setScrollOffset] = createSignal(
      opts.initialScrollOffset ?? 0,
    );
    super("scrollController", { ...opts, setScrollOffset });
    this.scrollOffset = scrollOffset;
  }

  animateTo(offset: number, opts?: { duration?: number }) {
    return this.call("animateTo", { offset, ...opts });
  }

  jumpTo(offset: number) {
    return this.call("jumpTo", offset);
  }
}

/**
 * Create a scroll controller backed by a Flutter `ScrollController`. Pass it to
 * a `<ScrollView controller={...}>` to drive scrolling imperatively and read
 * the offset reactively.
 *
 * Created inside a reactive owner it auto-disposes on cleanup; otherwise (or
 * with `new ScrollController(...)`) call `dispose()` yourself.
 */
export function createScrollController(
  opts: { initialScrollOffset?: number } = {},
): ScrollController {
  const controller = new ScrollController(opts);
  if (getOwner()) onCleanup(() => controller.dispose());
  return controller;
}
