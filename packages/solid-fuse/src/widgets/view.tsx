import type { AlignmentGeometry, BoxDecoration, EdgeInsetsGeometry } from "../flutter";
import type { BaseProps, LayoutInput, TransformInput } from "../types";

export interface ViewProps extends BaseProps {
  layout?: LayoutInput;
  padding?: EdgeInsetsGeometry;
  margin?: EdgeInsetsGeometry;
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  alignment?: AlignmentGeometry;
  decoration?: BoxDecoration;
  foregroundDecoration?: BoxDecoration;
  transform?: TransformInput;
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
  opacity?: number;
  visible?: boolean;
  ignorePointer?: boolean;
}

export function View(props: ViewProps) {
  return <view {...props} />;
}
