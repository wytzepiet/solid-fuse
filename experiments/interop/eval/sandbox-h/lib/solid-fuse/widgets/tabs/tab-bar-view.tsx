import type { BaseProps } from "../../types";
import type { TabController } from "../../tab-controller";

export interface TabBarViewProps extends BaseProps {
  /** The shared controller. Omit it inside a `<DefaultTabController>` — the
   *  view resolves the controller from context. */
  controller?: TabController;
  physics?: "bouncing" | "clamping" | "always" | "never" | "page";
  /** Fraction of the viewport each page occupies (defaults to 1). */
  viewportFraction?: number;
}

export function TabBarView(props: TabBarViewProps) {
  return <tabBarView {...props} />;
}
