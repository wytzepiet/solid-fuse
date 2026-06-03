import type { BaseProps } from "../types";

export interface SliverFillViewportProps extends BaseProps {
  viewportFraction?: number;
  padEnds?: boolean;
  addAutomaticKeepAlives?: boolean;
  addRepaintBoundaries?: boolean;
  addSemanticIndexes?: boolean;
}

export function SliverFillViewport(props: SliverFillViewportProps) {
  return <sliverFillViewport {...props} />;
}
