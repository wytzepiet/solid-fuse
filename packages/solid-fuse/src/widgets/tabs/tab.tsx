import type { BaseProps } from "../../types";

export interface TabProps extends BaseProps {
  /** A plain text label. Mutually exclusive with `children` (Flutter's `Tab`
   *  takes one or the other). */
  text?: string;
  /** Override the tab's height. */
  height?: number;
}

export function Tab(props: TabProps) {
  return <tab {...props} />;
}
