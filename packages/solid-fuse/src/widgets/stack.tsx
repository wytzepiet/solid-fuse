import type { AlignmentString, BaseProps } from "../types";

export interface StackProps extends BaseProps {
  alignment?: AlignmentString;
  textDirection?: "ltr" | "rtl";
  fit?: "loose" | "expand" | "passthrough";
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
}

export function Stack(props: StackProps) {
  return <stack {...props} />;
}
