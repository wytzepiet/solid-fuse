import type { BaseProps, EdgeInsetsInput } from "../types";

export type StretchMode = "zoomBackground" | "blurBackground" | "fadeTitle";

export interface FlexibleSpaceBarProps extends BaseProps {
  // Slots (inline JSX widgets)
  title?: JSX.Element;
  background?: JSX.Element;

  centerTitle?: boolean;
  titlePadding?: EdgeInsetsInput;
  expandedTitleScale?: number;
  collapseMode?: "none" | "pin" | "parallax";
  stretchModes?: StretchMode[];
}

export function FlexibleSpaceBar(props: FlexibleSpaceBarProps) {
  return <flexibleSpaceBar {...props} />;
}
