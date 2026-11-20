import type { BaseProps } from "../types";

export interface SliverGridProps extends BaseProps {
  crossAxisCount?: number;
  maxCrossAxisExtent?: number;
  mainAxisSpacing?: number;
  crossAxisSpacing?: number;
  childAspectRatio?: number;
  mainAxisExtent?: number;
  addAutomaticKeepAlives?: boolean;
  addRepaintBoundaries?: boolean;
  addSemanticIndexes?: boolean;
}

export function SliverGrid(props: SliverGridProps) {
  return <sliverGrid {...props} />;
}
