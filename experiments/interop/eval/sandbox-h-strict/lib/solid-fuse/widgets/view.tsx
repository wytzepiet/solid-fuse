import type {
  AlignmentString,
  BaseProps,
  DecorationInput,
  EdgeInsetsInput,
  FlexInput,
  TransformInput,
} from "../types";

export interface ViewProps extends BaseProps {
  flex?: FlexInput;
  padding?: EdgeInsetsInput;
  margin?: EdgeInsetsInput;
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  alignment?: AlignmentString;
  decoration?: DecorationInput;
  foregroundDecoration?: DecorationInput;
  grow?: number;
  fit?: "tight" | "loose";
  transform?: TransformInput;
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
  opacity?: number;
  visible?: boolean;
  ignorePointer?: boolean;
}

export function View(props: ViewProps) {
  return <view {...props} />;
}
