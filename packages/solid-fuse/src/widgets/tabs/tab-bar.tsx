import type {
  BaseProps,
  ColorInput,
  DecorationInput,
  EdgeInsetsInput,
} from "../../types";
import type { TextStyleProps } from "../text";
import type { TabController } from "../../tab-controller";

/** The concrete ink-splash factories Flutter ships, as a string enum.
 *  `"noSplash"` removes the splash entirely; `"ink"` is the Material default. */
export type SplashFactory =
  | "ink"
  | "noSplash"
  | "inkRipple"
  | "inkSparkle"
  | "inkSplash";

export interface TabBarProps extends BaseProps {
  /** The shared controller. Omit it inside a `<DefaultTabController>` — the
   *  bar resolves the controller from context. */
  controller?: TabController;
  /** Let the tabs scroll horizontally instead of sharing the width equally. */
  isScrollable?: boolean;
  indicatorColor?: ColorInput;
  indicatorWeight?: number;
  /** Whether the indicator spans the whole tab or just the label. */
  indicatorSize?: "tab" | "label";
  /** A custom indicator decoration. Overrides `indicatorColor`/`indicatorWeight`. */
  indicator?: DecorationInput;
  /** Insets the indicator from the tab's edges. */
  indicatorPadding?: EdgeInsetsInput;
  /** How the indicator moves between tabs. `"linear"` slides at a constant
   *  rate; `"elastic"` stretches and settles. */
  indicatorAnimation?: "linear" | "elastic";
  labelColor?: ColorInput;
  unselectedLabelColor?: ColorInput;
  /** Text style for the selected tab's label. */
  labelStyle?: TextStyleProps;
  /** Text style for unselected tabs' labels. */
  unselectedLabelStyle?: TextStyleProps;
  /** Padding around each tab's label. */
  labelPadding?: EdgeInsetsInput;
  dividerColor?: ColorInput;
  dividerHeight?: number;
  padding?: EdgeInsetsInput;
  /** How tabs are laid out along the bar. `"fill"` (default for fixed bars)
   *  splits the width; `"start"`/`"startOffset"`/`"center"` apply when scrollable. */
  tabAlignment?: "start" | "startOffset" | "fill" | "center";
  /** The hover/focus/press ink colour (Flutter's `overlayColor`). Set it to
   *  `"transparent"` to make the ink invisible without disabling the splash. */
  overlayColor?: ColorInput;
  /** Which ink-splash factory to use. `"noSplash"` removes the splash entirely. */
  splashFactory?: SplashFactory;
  /** Pointer cursor over the tabs. */
  mouseCursor?: "click" | "basic" | "forbidden" | "grab" | "text" | "none";
  /** Whether a tap produces an audible/haptic feedback. Defaults to platform. */
  enableFeedback?: boolean;
  /** Whether the indicator colour auto-adjusts to contrast with the background.
   *  Defaults to `true`. */
  automaticIndicatorColorAdjustment?: boolean;
  /** Scroll physics when `isScrollable`. */
  physics?: "bouncing" | "clamping" | "always" | "never" | "page";
  /** Fired with the tapped tab's index. The controller already updates on
   *  tap; this is an extra hook. */
  onTap?: (index: number) => void;
}

export function TabBar(props: TabBarProps) {
  return <tabBar {...props} />;
}
