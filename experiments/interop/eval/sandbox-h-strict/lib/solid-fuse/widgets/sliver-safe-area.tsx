import type { BaseProps, EdgeInsetsInput } from "../types";

export interface SliverSafeAreaProps extends BaseProps {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  minimum?: EdgeInsetsInput;
}

export function SliverSafeArea(props: SliverSafeAreaProps) {
  return <sliverSafeArea {...props} />;
}
