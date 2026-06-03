import type { BaseProps } from "../types";

export interface SliverCrossAxisExpandedProps extends BaseProps {
  /** Cross-axis flex factor relative to sibling expanded slivers. Defaults to 1. */
  flex?: number;
}

/**
 * Sizes a single sliver child along the cross axis by a {@link flex} factor.
 *
 * Must be a *direct* child of {@link SliverCrossAxisGroup} — Flutter reads the
 * flex during the group's cross-axis layout, so any other parent throws.
 */
export function SliverCrossAxisExpanded(props: SliverCrossAxisExpandedProps) {
  return <sliverCrossAxisExpanded {...props} />;
}
