import type { BaseProps, EdgeInsetsInput, LayoutInput } from "../types";

export interface ScrollViewProps extends BaseProps {
  scrollDirection?: "vertical" | "horizontal";
  layout?: LayoutInput;
  padding?: EdgeInsetsInput;
  physics?: "bouncing" | "clamping" | "always" | "never" | "page";
  reverse?: boolean;
  primary?: boolean;
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
  keyboardDismissBehavior?: "manual" | "onDrag";
  dragStartBehavior?: "start" | "down";
  hitTestBehavior?: "deferToChild" | "opaque" | "translucent";
  restorationId?: string;
  controller?: import("../scroll-controller").ScrollController;
}

export function ScrollView(props: ScrollViewProps) {
  return <scrollView {...props} />;
}
