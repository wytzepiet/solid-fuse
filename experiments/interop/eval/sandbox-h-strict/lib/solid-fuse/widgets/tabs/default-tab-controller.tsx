import type { BaseProps } from "../../types";

export interface DefaultTabControllerProps extends BaseProps {
  /** Number of tabs. */
  length: number;
  initialIndex?: number;
}

/**
 * Provides a tab controller to everything below it. A `<TabBar>` and
 * `<TabBarView>` in the subtree pick it up from context — no explicit
 * controller needed. Reach for `createTabController` when JS needs the index
 * or programmatic control.
 */
export function DefaultTabController(props: DefaultTabControllerProps) {
  return <defaultTabController {...props} />;
}
