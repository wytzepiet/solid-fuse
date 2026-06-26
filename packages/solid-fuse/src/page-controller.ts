import { createSignal, getOwner, onCleanup } from "solid-js";
import { FuseHandle } from "./handle";

export interface PageControllerOptions {
  /** Page to show first. Default 0. */
  initialPage?: number;
  /** Preserve the current page in the [PageStorage]. Default true. */
  keepPage?: boolean;
  /** Fraction of the viewport each page occupies. < 1 reveals neighbours.
   *  Default 1. */
  viewportFraction?: number;
}

export interface PageAnimateOptions {
  /** Animation duration in milliseconds. Default 300. */
  duration?: number;
  /** Easing curve name (e.g. "easeInOut", "fastOutSlowIn"). Default
   *  "easeInOut". */
  curve?: string;
}

export class PageController extends FuseHandle<"pageController"> {
  /** Reactive signal — the current page as a fractional value, updating every
   *  frame as the user drags. Settles to an integer when a page lands. Round it
   *  for the active index, or compare against a child's index for visibility:
   *  `Math.abs(page() - i) < 1`. */
  readonly page: () => number;

  constructor(opts: PageControllerOptions = {}) {
    const [page, setPage] = createSignal(opts.initialPage ?? 0);
    // setPage rides the create op (see encodeProp): Dart wires it to the
    // PageController's listener so `page()` tracks the live scroll position.
    super("pageController", { ...opts, setPage });
    this.page = page;
  }

  /** Animate to [page] over [duration] ms with [curve]. */
  animateToPage(page: number, opts?: PageAnimateOptions) {
    return this.call("animateToPage", { page, ...opts });
  }

  /** Jump to [page] with no animation. */
  jumpToPage(page: number) {
    return this.call("jumpToPage", page);
  }

  /** Animate to the next page. */
  nextPage(opts?: PageAnimateOptions) {
    return this.call("nextPage", opts ?? {});
  }

  /** Animate to the previous page. */
  previousPage(opts?: PageAnimateOptions) {
    return this.call("previousPage", opts ?? {});
  }
}

/**
 * Create a page controller backed by a Flutter `PageController`. Pass it to a
 * `<PageView controller={...}>` to drive paging imperatively and read the
 * current page reactively via `page()`.
 *
 * Created inside a reactive owner it auto-disposes on cleanup; otherwise (or
 * with `new PageController(...)`) call `dispose()` yourself.
 */
export function createPageController(
  opts: PageControllerOptions = {},
): PageController {
  const controller = new PageController(opts);
  if (getOwner()) onCleanup(() => controller.dispose());
  return controller;
}
