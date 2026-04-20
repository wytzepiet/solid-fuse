import type {
  BaseProps,
  ColorInput,
  FontWeight,
  ShadowInput,
} from "../types";

export interface TextProps extends BaseProps {
  fontSize?: number;
  fontWeight?: FontWeight;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  color?: ColorInput;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";
  maxLines?: number;
  overflow?: "clip" | "fade" | "ellipsis" | "visible";
  textDirection?: "ltr" | "rtl";
  softWrap?: boolean;
  textDecoration?: "none" | "underline" | "overline" | "lineThrough";
  textDecorationColor?: ColorInput;
  textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | "wavy";
  backgroundColor?: ColorInput;
  shadows?: ShadowInput | ShadowInput[];
  locale?: string;
}

export function Text(props: TextProps) {
  return <text {...props} />;
}
