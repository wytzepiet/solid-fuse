import type { BaseProps } from "../types";

// A sliver whose single child reappears (floats in) as soon as the user scrolls
// towards the leading edge, regardless of the current scroll offset.
// Requires Flutter >= 3.24; `snapMode` requires Flutter >= 3.27.
export interface SliverFloatingHeaderProps extends BaseProps {
  // Overrides the default 300ms / easeInOut show & hide animation.
  animationStyle?: {
    duration?: number; // milliseconds
    curve?: string;
  };
  // How a partially visible header settles when a scroll gesture ends.
  snapMode?: "overlay" | "scroll";
}

export function SliverFloatingHeader(props: SliverFloatingHeaderProps) {
  return <sliverFloatingHeader {...props} />;
}
