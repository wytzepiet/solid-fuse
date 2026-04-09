// ─── Shared input types ──────────────────────────────────────────────────────

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

// ─── Widget prop types ───────────────────────────────────────────────────────

export interface ViewProps {
  children?: any;
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
  color?: ColorInput;
  borderRadius?: BorderRadiusInput;
  border?: BorderInput;
  shadow?: ShadowInput | ShadowInput[];
  gradient?: GradientInput;
  image?: ImageInput;
  shape?: "rectangle" | "circle";
  blendMode?: string;
  grow?: number;
  fit?: "tight" | "loose";
  transform?: TransformInput;
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
  opacity?: number;
  visible?: boolean;
  ignorePointer?: boolean;
}

export interface TextProps {
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
}

// ─── Gesture detail types ────────────────────────────────────────────────────

export interface TapDownDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface TapUpDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface LongPressDownDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface LongPressStartDetails {
  x: number; y: number;
  localX: number; localY: number;
}

export interface LongPressMoveUpdateDetails {
  x: number; y: number;
  localX: number; localY: number;
  offsetX: number; offsetY: number;
}

export interface LongPressEndDetails {
  x: number; y: number;
  localX: number; localY: number;
  vx: number; vy: number;
}

export interface DragDownDetails {
  x: number; y: number;
  localX: number; localY: number;
}

export interface DragStartDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface DragUpdateDetails {
  x: number; y: number;
  localX: number; localY: number;
  dx: number; dy: number;
  primaryDelta?: number;
}

export interface DragEndDetails {
  x: number; y: number;
  localX: number; localY: number;
  vx: number; vy: number;
  primaryVelocity?: number;
}

export interface ScaleStartDetails {
  x: number; y: number;
  localX: number; localY: number;
  pointerCount: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface ScaleUpdateDetails {
  x: number; y: number;
  localX: number; localY: number;
  scale: number;
  horizontalScale: number;
  verticalScale: number;
  rotation: number;
  pointerCount: number;
  dx: number; dy: number;
}

export interface ScaleEndDetails {
  vx: number; vy: number;
  scaleVelocity: number;
  pointerCount: number;
}

export type PointerDevice = "touch" | "mouse" | "stylus" | "trackpad";

// ─── GestureDetector ─────────────────────────────────────────────────────────

export interface GestureDetectorProps {
  children?: any;
  flex?: FlexInput;
  // Tap
  onTapDown?: (details: TapDownDetails) => void;
  onTapUp?: (details: TapUpDetails) => void;
  onTap?: () => void;
  onTapCancel?: () => void;
  // Secondary tap (right-click)
  onSecondaryTap?: () => void;
  onSecondaryTapDown?: (details: TapDownDetails) => void;
  onSecondaryTapUp?: (details: TapUpDetails) => void;
  onSecondaryTapCancel?: () => void;
  // Tertiary tap (middle-click)
  onTertiaryTapDown?: (details: TapDownDetails) => void;
  onTertiaryTapUp?: (details: TapUpDetails) => void;
  onTertiaryTapCancel?: () => void;
  // Double tap
  onDoubleTapDown?: (details: TapDownDetails) => void;
  onDoubleTap?: () => void;
  onDoubleTapCancel?: () => void;
  // Long press
  onLongPressDown?: (details: LongPressDownDetails) => void;
  onLongPressCancel?: () => void;
  onLongPress?: () => void;
  onLongPressStart?: (details: LongPressStartDetails) => void;
  onLongPressMoveUpdate?: (details: LongPressMoveUpdateDetails) => void;
  onLongPressUp?: () => void;
  onLongPressEnd?: (details: LongPressEndDetails) => void;
  // Secondary long press
  onSecondaryLongPressDown?: (details: LongPressDownDetails) => void;
  onSecondaryLongPressCancel?: () => void;
  onSecondaryLongPress?: () => void;
  onSecondaryLongPressStart?: (details: LongPressStartDetails) => void;
  onSecondaryLongPressMoveUpdate?: (details: LongPressMoveUpdateDetails) => void;
  onSecondaryLongPressUp?: () => void;
  onSecondaryLongPressEnd?: (details: LongPressEndDetails) => void;
  // Tertiary long press
  onTertiaryLongPressDown?: (details: LongPressDownDetails) => void;
  onTertiaryLongPressCancel?: () => void;
  onTertiaryLongPress?: () => void;
  onTertiaryLongPressStart?: (details: LongPressStartDetails) => void;
  onTertiaryLongPressMoveUpdate?: (details: LongPressMoveUpdateDetails) => void;
  onTertiaryLongPressUp?: () => void;
  onTertiaryLongPressEnd?: (details: LongPressEndDetails) => void;
  // Vertical drag
  onVerticalDragDown?: (details: DragDownDetails) => void;
  onVerticalDragStart?: (details: DragStartDetails) => void;
  onVerticalDragUpdate?: (details: DragUpdateDetails) => void;
  onVerticalDragEnd?: (details: DragEndDetails) => void;
  onVerticalDragCancel?: () => void;
  // Horizontal drag
  onHorizontalDragDown?: (details: DragDownDetails) => void;
  onHorizontalDragStart?: (details: DragStartDetails) => void;
  onHorizontalDragUpdate?: (details: DragUpdateDetails) => void;
  onHorizontalDragEnd?: (details: DragEndDetails) => void;
  onHorizontalDragCancel?: () => void;
  // Pan (free drag)
  onPanDown?: (details: DragDownDetails) => void;
  onPanStart?: (details: DragStartDetails) => void;
  onPanUpdate?: (details: DragUpdateDetails) => void;
  onPanEnd?: (details: DragEndDetails) => void;
  onPanCancel?: () => void;
  // Scale (pinch/zoom)
  onScaleStart?: (details: ScaleStartDetails) => void;
  onScaleUpdate?: (details: ScaleUpdateDetails) => void;
  onScaleEnd?: (details: ScaleEndDetails) => void;
  // Config
  behavior?: "deferToChild" | "opaque" | "translucent";
  excludeFromSemantics?: boolean;
  dragStartBehavior?: "start" | "down";
  trackpadScrollCausesScale?: boolean;
  trackpadScrollToScaleFactor?: { x: number; y: number };
  supportedDevices?: PointerDevice[];
}

export interface NavigatorProps {
  children?: any;
  onPopPage?: () => void;
}

export interface ScrollViewProps {
  children?: any;
  scrollDirection?: "vertical" | "horizontal";
  flex?: FlexInput;
  padding?: EdgeInsetsInput;
  physics?: "bouncing" | "clamping";
  reverse?: boolean;
}

export interface StackProps {
  children?: any;
  alignment?: AlignmentString;
  fit?: "loose" | "expand" | "passthrough";
  clipBehavior?: "none" | "hardEdge" | "antiAlias";
}

export interface PositionedProps {
  children?: any;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  flex?: FlexInput;
}
