import type { BaseProps, FlexInput } from "../types";

export interface PositionedProps extends BaseProps {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  flex?: FlexInput;
}

export function Positioned(props: PositionedProps) {
  return <positioned {...props} />;
}
