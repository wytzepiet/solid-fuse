// Shared input and primitive types used across widgets.
// Widget-specific prop types live alongside their components in `./widgets/`.

export type NamedColor =
  | "red" | "blue" | "green" | "white" | "black" | "grey"
  | "orange" | "purple" | "yellow" | "teal" | "cyan" | "amber"
  | "indigo" | "pink" | "brown" | "transparent";

export type ColorInput =
  | NamedColor
  | (string & {})
  | { r: number; g: number; b: number; a?: number }
  | { h: number; s: number; l: number; a?: number };

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
  color?: ColorInput;
};

export type BorderInput = BorderSideInput | {
  all?: BorderSideInput;
  top?: BorderSideInput;
  bottom?: BorderSideInput;
  left?: BorderSideInput;
  right?: BorderSideInput;
};

export type ShadowInput = {
  color?: ColorInput;
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
  colors: ColorInput[];
  stops?: number[];
  begin?: AlignmentString;
  end?: AlignmentString;
  center?: AlignmentString;
  radius?: number;
};

export type ImageInput = {
  url: string;
  fit?: "contain" | "cover" | "fill" | "fitWidth" | "fitHeight" | "none";
};

export type DecorationInput = {
  color?: ColorInput;
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
