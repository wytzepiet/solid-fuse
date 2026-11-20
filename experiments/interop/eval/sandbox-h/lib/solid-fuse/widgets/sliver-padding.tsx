import type { BaseProps, EdgeInsetsInput } from "../types";

export interface SliverPaddingProps extends BaseProps {
  padding?: EdgeInsetsInput;
}

export function SliverPadding(props: SliverPaddingProps) {
  return <sliverPadding {...props} />;
}
