// Shared input and primitive types used across widgets.
// Widget-specific prop types live alongside their components in `./widgets/`.

// Colors are always a `Color` value — build them with `Color.rgb`/`hsl`/`hex`/
// `oklch` or the named constants (`Color.red`, `Color.white`, …). Re-exported
// here so widget prop types can pull it in alongside the other input shapes.
import type { Color } from "./color";
export type { Color };

export type EdgeInsetsInput = number | {
  all?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  horizontal?: number;
  vertical?: number;
};

export type BorderRadiusInput = number | {
  all?: number;
  topLeft?: number;
  topRight?: number;
  bottomLeft?: number;
  bottomRight?: number;
};

export type BorderSideInput = {
  width?: number;
  color?: Color;
};

export type BorderInput = BorderSideInput | {
  all?: BorderSideInput;
  top?: BorderSideInput;
  bottom?: BorderSideInput;
  left?: BorderSideInput;
  right?: BorderSideInput;
};

export type ShadowInput = {
  color?: Color;
  blurRadius?: number;
  spreadRadius?: number;
  offsetX?: number;
  offsetY?: number;
};

export type FontWeight =
  | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  | "thin" | "extraLight" | "light" | "regular" | "medium"
  | "semiBold" | "bold" | "extraBold" | "black";

export type AlignmentString =
  | "topLeft" | "topCenter" | "topRight"
  | "centerLeft" | "center" | "centerRight"
  | "bottomLeft" | "bottomCenter" | "bottomRight";

export type GradientInput = {
  type?: "linear" | "radial";
  colors: Color[];
  stops?: number[];
  begin?: AlignmentString;
  end?: AlignmentString;
  center?: AlignmentString;
  radius?: number;
};

export type BoxFit =
  | "contain" | "cover" | "fill" | "fitWidth" | "fitHeight" | "none" | "scaleDown";

export type ImageRepeat = "noRepeat" | "repeat" | "repeatX" | "repeatY";

export type ImageInput = {
  url: string;
  fit?: BoxFit;
};

export type DecorationInput = {
  color?: Color;
  borderRadius?: BorderRadiusInput;
  border?: BorderInput;
  shadow?: ShadowInput | ShadowInput[];
  gradient?: GradientInput;
  image?: ImageInput;
  shape?: "rectangle" | "circle";
  blendMode?: string;
};

export type TransformInput = {
  rotate?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
};

export type FlexInput = {
  direction?: "horizontal" | "vertical";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly";
  expand?: boolean;
};

// Base props every widget accepts.
export interface BaseProps {
  children?: any;
  ref?: import("./renderer").FuseNode | ((el: import("./renderer").FuseNode) => void);
}
