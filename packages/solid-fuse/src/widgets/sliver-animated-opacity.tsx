import type { BaseProps } from "../types";

type CurveName =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInOutCubic"
  | "fastOutSlowIn"
  | "decelerate"
  | "bounceIn"
  | "bounceOut"
  | "bounceInOut"
  | "elasticIn"
  | "elasticOut"
  | "elasticInOut";

export interface SliverAnimatedOpacityProps extends BaseProps {
  opacity?: number;
  /** Animation duration in milliseconds. */
  duration?: number;
  curve?: CurveName;
  alwaysIncludeSemantics?: boolean;
  onEnd?: () => void;
}

export function SliverAnimatedOpacity(props: SliverAnimatedOpacityProps) {
  return <sliverAnimatedOpacity {...props} />;
}
