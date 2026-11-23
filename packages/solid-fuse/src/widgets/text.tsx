import type { Color, FontWeight, Shadow, TextDecoration } from "../flutter";
import type { BaseProps } from "../types";

export interface TextProps extends BaseProps {
  fontSize?: number;
  fontWeight?: FontWeight;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  color?: Color;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";
  maxLines?: number;
  overflow?: "clip" | "fade" | "ellipsis" | "visible";
  textDirection?: "ltr" | "rtl";
  softWrap?: boolean;
  textDecoration?: TextDecoration;
  textDecorationColor?: Color;
  textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | "wavy";
  backgroundColor?: Color;
  shadows?: Shadow[];
  locale?: string;
}

export function Text(props: TextProps) {
  return <text {...props} />;
}
