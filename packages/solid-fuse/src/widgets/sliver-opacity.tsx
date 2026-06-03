import type { BaseProps } from "../types";

export interface SliverOpacityProps extends BaseProps {
  opacity?: number;
  alwaysIncludeSemantics?: boolean;
}

export function SliverOpacity(props: SliverOpacityProps) {
  return <sliverOpacity {...props} />;
}
