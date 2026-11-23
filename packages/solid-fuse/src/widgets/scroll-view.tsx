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
  /** A scroll controller from `createScrollController` (`#fuse/flutter`). */
  controller?: import("../types").ScrollControllerInput;
}

export function ScrollView(props: ScrollViewProps) {
  return <scrollView {...props} />;
}
