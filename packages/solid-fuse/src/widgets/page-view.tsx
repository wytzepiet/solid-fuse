import type { BaseProps } from "../types";

export interface PageViewProps extends BaseProps {
  /** Scroll axis. Default "horizontal". */
  scrollDirection?: "horizontal" | "vertical";
  physics?: "bouncing" | "clamping" | "always" | "never" | "page";
  reverse?: boolean;
  /** Snap to page boundaries on release. Default true. */
  pageSnapping?: boolean;
  /** Keep the off-screen neighbour pages alive so they can preload (e.g. a
   *  video buffering before it slides in). Default false. */
  allowImplicitScrolling?: boolean;
  /** Add half-page padding before the first / after the last page when
   *  `viewportFraction` < 1. Default true. */
  padEnds?: boolean;
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
  dragStartBehavior?: "start" | "down";
  restorationId?: string;
  controller?: import("../page-controller").PageController;
  /** Fires with the settled integer index each time a page lands. For the live
   *  fractional position, read `controller.page()` instead. */
  onPageChanged?: (page: number) => void;
}

/**
 * A scrollable list whose children snap one-per-viewport. Children are built
 * eagerly in JS; Flutter renders only the visible window lazily.
 */
export function PageView(props: PageViewProps) {
  return <pageView {...props} />;
}
