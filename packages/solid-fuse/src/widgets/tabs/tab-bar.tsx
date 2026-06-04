import type { BaseProps, ColorInput, EdgeInsetsInput } from "../../types";
import type { TabController } from "../../tab-controller";

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
  labelColor?: ColorInput;
  unselectedLabelColor?: ColorInput;
  dividerColor?: ColorInput;
  dividerHeight?: number;
  padding?: EdgeInsetsInput;
  /** Fired with the tapped tab's index. The controller already updates on
   *  tap; this is an extra hook. */
  onTap?: (index: number) => void;
}

export function TabBar(props: TabBarProps) {
  return <tabBar {...props} />;
}
