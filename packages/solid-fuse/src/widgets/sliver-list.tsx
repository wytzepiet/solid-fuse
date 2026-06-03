import type { BaseProps } from "../types";

export interface SliverListProps extends BaseProps {
  itemExtent?: number;
  prototypeItem?: any;
  addAutomaticKeepAlives?: boolean;
  addRepaintBoundaries?: boolean;
  addSemanticIndexes?: boolean;
}

export function SliverList(props: SliverListProps) {
  return <sliverList {...props} />;
}
