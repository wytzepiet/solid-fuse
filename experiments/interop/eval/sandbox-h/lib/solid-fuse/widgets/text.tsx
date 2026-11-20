import type {
  BaseProps,
  ColorInput,
  FontWeight,
  ShadowInput,
} from "../types";

/** The TextStyle subset shared by `Text` (root style) and `TextSpan` (a run). */
export interface TextStyleProps {
  fontSize?: number;
  fontWeight?: FontWeight;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  color?: ColorInput;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  textDecoration?: "none" | "underline" | "overline" | "lineThrough";
  textDecorationColor?: ColorInput;
  textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | "wavy";
  backgroundColor?: ColorInput;
  shadows?: ShadowInput | ShadowInput[];
}

export interface TextProps extends BaseProps, TextStyleProps {
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";
  maxLines?: number;
  overflow?: "clip" | "fade" | "ellipsis" | "visible";
  textDirection?: "ltr" | "rtl";
  softWrap?: boolean;
  /** Linear scale applied to every font size in the block. */
  textScaler?: number;
  locale?: string;
}

/**
 * A text block (Flutter `Text`). With a string child it's a plain label; give it
 * `<TextSpan>` runs and/or inline widgets as children and it becomes a wrapping
 * rich block (`Text.rich`) — any non-`TextSpan` child flows inline as a
 * `WidgetSpan`. The props here set the block layout and the root style every run
 * inherits.
 */
export function Text(props: TextProps) {
  return <text {...props} />;
}

/** Placeholder alignment for a widget child flowed inline inside a `Text`. */
export type InlineWidgetAlignment =
  | "baseline"
  | "aboveBaseline"
  | "belowBaseline"
  | "top"
  | "bottom"
  | "middle";

export interface TextSpanProps extends TextStyleProps {
  /** Tap handler for this run (wired to a `TapGestureRecognizer`). */
  onTap?: () => void;
  /** A string, nested `<TextSpan>`s, or a mix. */
  children?: any;
}

/**
 * A styled, optionally tappable run of text inside a `<Text>`. Children may be a
 * string and/or nested `<TextSpan>`s. Only meaningful as a child of `<Text>`.
 */
export function TextSpan(props: TextSpanProps) {
  return <textSpan {...props} />;
}
