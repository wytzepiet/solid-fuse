import type { BaseProps, FlexInput } from "../types";

export interface AbsorbPointerProps extends BaseProps {
  flex?: FlexInput;
  /** When true (default), the subtree absorbs pointer events so neither it nor
   *  the widgets behind it receive them. */
  absorbing?: boolean;
}

export function AbsorbPointer(props: AbsorbPointerProps) {
  return <absorbPointer {...props} />;
}
