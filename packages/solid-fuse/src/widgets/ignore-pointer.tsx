import type { BaseProps, FlexInput } from "../types";

export interface IgnorePointerProps extends BaseProps {
  flex?: FlexInput;
  /** When true (default), the subtree is invisible to hit-testing and events
   *  pass through to widgets behind it. */
  ignoring?: boolean;
}

export function IgnorePointer(props: IgnorePointerProps) {
  return <ignorePointer {...props} />;
}
