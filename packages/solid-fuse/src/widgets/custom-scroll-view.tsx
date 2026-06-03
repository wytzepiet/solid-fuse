import type { BaseProps } from "../types";

export interface CustomScrollViewProps extends BaseProps {
  scrollDirection?: "vertical" | "horizontal";
  reverse?: boolean;
  controller?: import("../scroll-controller").ScrollController;
  primary?: boolean;
  physics?: "bouncing" | "clamping" | "always" | "never" | "page";
  shrinkWrap?: boolean;
  anchor?: number;
  cacheExtent?: number;
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
  keyboardDismissBehavior?: "manual" | "onDrag";
  dragStartBehavior?: "start" | "down";
  hitTestBehavior?: "deferToChild" | "opaque" | "translucent";
  restorationId?: string;
  paintOrder?: "firstIsTop" | "lastIsTop";
}

export function CustomScrollView(props: CustomScrollViewProps) {
  return <customScrollView {...props} />;
}
