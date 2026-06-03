import type { BaseProps } from "../types";

export interface SliverFillRemainingProps extends BaseProps {
  hasScrollBody?: boolean;
  fillOverscroll?: boolean;
}

export function SliverFillRemaining(props: SliverFillRemainingProps) {
  return <sliverFillRemaining {...props} />;
}
