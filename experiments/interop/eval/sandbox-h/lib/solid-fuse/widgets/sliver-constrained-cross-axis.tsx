import type { BaseProps } from "../types";

export interface SliverConstrainedCrossAxisProps extends BaseProps {
  /** Maximum cross-axis extent of the single sliver child. Defaults to unconstrained. */
  maxExtent?: number;
}

export function SliverConstrainedCrossAxis(props: SliverConstrainedCrossAxisProps) {
  return <sliverConstrainedCrossAxis {...props} />;
}
