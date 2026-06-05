import type { BaseProps, FlexInput } from "../types";

export interface PositionedProps extends BaseProps {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  /** Mirrors Flutter's Positioned.fill: sets unset sides (top/left/right/bottom) to 0. Explicit sides override. */
  fill?: boolean;
  flex?: FlexInput;
}

export function Positioned(props: PositionedProps) {
  return <positioned {...props} />;
}
