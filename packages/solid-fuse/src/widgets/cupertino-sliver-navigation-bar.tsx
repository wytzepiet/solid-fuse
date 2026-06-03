import type { BaseProps, BorderInput, ColorInput, EdgeInsetsInput } from "../types";

export interface CupertinoSliverNavigationBarProps extends BaseProps {
  // Slots (inline JSX widgets)
  largeTitle?: JSX.Element;
  leading?: JSX.Element;
  middle?: JSX.Element;
  trailing?: JSX.Element;
  bottom?: JSX.Element;
  bottomHeight?: number;

  automaticallyImplyLeading?: boolean;
  automaticallyImplyTitle?: boolean;
  alwaysShowMiddle?: boolean;
  stretch?: boolean;
  transitionBetweenRoutes?: boolean;

  brightness?: "light" | "dark";
  backgroundColor?: ColorInput;
  border?: BorderInput;
  padding?: EdgeInsetsInput;
}

export function CupertinoSliverNavigationBar(
  props: CupertinoSliverNavigationBarProps,
) {
  return <cupertinoSliverNavigationBar {...props} />;
}
