type NamedColor =
  | "red" | "blue" | "green" | "white" | "black" | "grey"
  | "orange" | "purple" | "yellow" | "teal" | "cyan" | "amber"
  | "indigo" | "pink" | "brown" | "transparent";

type ColorInput =
  | NamedColor
  | (string & {})
  | { r: number; g: number; b: number; a?: number }
  | { h: number; s: number; l: number; a?: number };

type EdgeInsetsInput = number | {
  all?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  horizontal?: number;
  vertical?: number;
};

type BorderRadiusInput = number | {
  all?: number;
  topLeft?: number;
  topRight?: number;
  bottomLeft?: number;
  bottomRight?: number;
};

type BorderSideInput = {
  width?: number;
  color?: ColorInput;
};

type BorderInput = BorderSideInput | {
  all?: BorderSideInput;
  top?: BorderSideInput;
  bottom?: BorderSideInput;
  left?: BorderSideInput;
  right?: BorderSideInput;
};

type ShadowInput = {
  color?: ColorInput;
  blurRadius?: number;
  spreadRadius?: number;
  offsetX?: number;
  offsetY?: number;
};

type FontWeight =
  | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  | "thin" | "extraLight" | "light" | "regular" | "medium"
  | "semiBold" | "bold" | "extraBold" | "black";

type AlignmentString =
  | "topLeft" | "topCenter" | "topRight"
  | "centerLeft" | "center" | "centerRight"
  | "bottomLeft" | "bottomCenter" | "bottomRight";

type GradientInput = {
  type?: "linear" | "radial";
  colors: ColorInput[];
  stops?: number[];
  // Linear gradient
  begin?: AlignmentString;
  end?: AlignmentString;
  // Radial gradient
  center?: AlignmentString;
  radius?: number;
};

type ImageInput = {
  url: string;
  fit?: "contain" | "cover" | "fill" | "fitWidth" | "fitHeight" | "none";
};

type TransformInput = {
  rotate?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
};

type FlexInput = {
  direction?: "horizontal" | "vertical";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly";
};

declare namespace JSX {
  // Must be `any` so that our FuseNode elements are assignable to
  // third-party Solid components' props (typed as solid-js's JSX.Element,
  // which includes DOM Node). The renderer handles real types at runtime.
  type Element = any;
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicElements {
    view: {
      children?: any;
      // Layout
      flex?: FlexInput;
      // Spacing
      padding?: EdgeInsetsInput;
      margin?: EdgeInsetsInput;
      // Sizing
      width?: number;
      height?: number;
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      aspectRatio?: number;
      // Decoration
      color?: ColorInput;
      borderRadius?: BorderRadiusInput;
      border?: BorderInput;
      shadow?: ShadowInput | ShadowInput[];
      gradient?: GradientInput;
      image?: ImageInput;
      shape?: "rectangle" | "circle";
      blendMode?: string;
      // Flex child
      grow?: number;
      fit?: "tight" | "loose";
      // Transform
      transform?: TransformInput;
      // Clipping
      clipBehavior?: "none" | "hardEdge" | "antiAlias";
      // Visibility & interaction
      opacity?: number;
      visible?: boolean;
      ignorePointer?: boolean;
    };
    text: {
      children?: any;
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
      softWrap?: boolean;
      textDecoration?: "none" | "underline" | "overline" | "lineThrough";
      textDecorationColor?: ColorInput;
      textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | "wavy";
      backgroundColor?: ColorInput;
      shadows?: ShadowInput | ShadowInput[];
      locale?: string;
    };
    gestureDetector: {
      children?: any;
      onTap?: () => void;
      onDoubleTap?: () => void;
      onLongPress?: () => void;
      flex?: FlexInput;
    };
    navigator: {
      children?: any;
      onPopPage?: () => void;
    };
    scrollView: {
      children?: any;
      scrollDirection?: "vertical" | "horizontal";
      flex?: FlexInput;
      padding?: EdgeInsetsInput;
      physics?: "bouncing" | "clamping";
      reverse?: boolean;
    };
    stack: {
      children?: any;
      alignment?: AlignmentString;
      fit?: "loose" | "expand";
      clipBehavior?: "none" | "hardEdge" | "antiAlias";
    };
    positioned: {
      children?: any;
      top?: number;
      left?: number;
      right?: number;
      bottom?: number;
      width?: number;
      height?: number;
      flex?: FlexInput;
    };
  }
}
