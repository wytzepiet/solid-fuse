import type { BaseProps, LayoutInput } from "../types";

export interface PositionedProps extends BaseProps {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  layout?: LayoutInput;
}

export function Positioned(props: PositionedProps) {
  return <positioned {...props} />;
}
