import type { BaseProps } from "../types";

// A sliver whose single child stays pinned at the leading edge of the viewport
// as the rest of the scroll content scrolls past it. Requires Flutter >= 3.24.
export interface PinnedHeaderSliverProps extends BaseProps {}

export function PinnedHeaderSliver(props: PinnedHeaderSliverProps) {
  return <pinnedHeaderSliver {...props} />;
}
