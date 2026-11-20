import type { BaseProps, ColorInput } from "../types";

export interface SliverAppBarProps extends BaseProps {
  // small (default) | medium | large constructor variant
  type?: "small" | "medium" | "large";

  // Slots (inline JSX widgets)
  leading?: JSX.Element;
  title?: JSX.Element;
  flexibleSpace?: JSX.Element;
  bottom?: JSX.Element;
  bottomHeight?: number;
  actions?: JSX.Element[];

  // Behavior
  pinned?: boolean;
  floating?: boolean;
  snap?: boolean;
  stretch?: boolean;
  forceElevated?: boolean;
  primary?: boolean;
  centerTitle?: boolean;
  automaticallyImplyLeading?: boolean;
  excludeHeaderSemantics?: boolean;

  // Metrics
  elevation?: number;
  scrolledUnderElevation?: number;
  expandedHeight?: number;
  collapsedHeight?: number;
  toolbarHeight?: number;
  titleSpacing?: number;
  stretchTriggerOffset?: number;
  leadingWidth?: number;

  // Colors
  backgroundColor?: ColorInput;
  foregroundColor?: ColorInput;
  shadowColor?: ColorInput;
  surfaceTintColor?: ColorInput;

  systemOverlayStyle?: "light" | "dark";
  clipBehavior?: "none" | "hardEdge" | "antiAlias";

  onStretchTrigger?: () => Promise<void>;
}

export function SliverAppBar(props: SliverAppBarProps) {
  return <sliverAppBar {...props} />;
}
