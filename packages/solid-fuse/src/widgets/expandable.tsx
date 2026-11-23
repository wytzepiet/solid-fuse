import type { FlexInput } from "../types";

export interface ExpandableProps {
  /** Always shown; tapping it toggles the body. */
  header: JSX.Element;
  /** Controlled. Leave out for an expandable that keeps its own state. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  disabled?: boolean;
  /** Animation length in ms. Default 200. */
  duration?: number;
  /** Keep the body alive while collapsed. Default true. */
  maintainState?: boolean;
  flex?: FlexInput;
  /** The body. */
  children?: JSX.Element;
}

/** A header that shows or hides its body, animated. */
export function Expandable(props: ExpandableProps) {
  return <expandable {...props} />;
}
