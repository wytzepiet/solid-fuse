import type { BaseProps } from "../types";

// A sliver that shrinks its pinned single child from `maxExtent` down to
// `minExtent` as the user scrolls, then stays pinned. The extents are derived
// from sized prototypes; if omitted the child's intrinsic size is used (min 0).
// Requires Flutter >= 3.24.
export interface SliverResizingHeaderProps extends BaseProps {
  minExtent?: number;
  maxExtent?: number;
}

export function SliverResizingHeader(props: SliverResizingHeaderProps) {
  return <sliverResizingHeader {...props} />;
}
