import type { AlignmentGeometry } from "../flutter";
import type { BaseProps } from "../types";

export interface StackProps extends BaseProps {
  alignment?: AlignmentGeometry;
  textDirection?: "ltr" | "rtl";
  fit?: "loose" | "expand" | "passthrough";
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
}

export function Stack(props: StackProps) {
  return <stack {...props} />;
}
