import type {
  BaseProps,
  ColorInput,
  FontWeight,
  ShadowInput,
} from "../types";

/** The TextStyle subset shared by `RichText` (root style) and `TextSpan`. */
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

export interface RichTextProps extends BaseProps, TextStyleProps {
  /** Maximum lines before truncating per `overflow`. */
  maxLines?: number;
  overflow?: "clip" | "fade" | "ellipsis" | "visible";
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";
  softWrap?: boolean;
  /** Linear scale applied to every font size in the block. */
  textScaler?: number;
}

/**
 * A wrapping rich-text block (Flutter `Text.rich`). Mixes styled/tappable
 * `<TextSpan>` runs and inline widgets — any non-`<TextSpan>` child flows inline
 * as a `WidgetSpan`. Bare string children render in the root style.
 */
export function RichText(props: RichTextProps) {
  return <richText {...props} />;
}

/** Placeholder alignment for a widget child flowed inline by `RichText`. */
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
 * A styled, optionally tappable run of text inside `<RichText>`. Children may be
 * a string and/or nested `<TextSpan>`s. Only valid inside `<RichText>`.
 */
export function TextSpan(props: TextSpanProps) {
  return <textSpan {...props} />;
}
