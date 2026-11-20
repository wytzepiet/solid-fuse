import type { BaseProps } from "../types";

export interface SliverIgnorePointerProps extends BaseProps {
  ignoring?: boolean;
}

export function SliverIgnorePointer(props: SliverIgnorePointerProps) {
  return <sliverIgnorePointer {...props} />;
}
