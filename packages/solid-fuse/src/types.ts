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

export interface TapDownInfo {
  x: number; y: number;
  localX: number; localY: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface TapUpInfo {
  x: number; y: number;
  localX: number; localY: number;
  kind: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface LongPressDownInfo {
  x: number; y: number;
  localX: number; localY: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface LongPressStartInfo {
  x: number; y: number;
  localX: number; localY: number;
}

export interface LongPressMoveUpdateInfo {
  x: number; y: number;
  localX: number; localY: number;
  offsetX: number; offsetY: number;
}

export interface LongPressEndInfo {
  x: number; y: number;
  localX: number; localY: number;
  vx: number; vy: number;
}

export interface DragDownInfo {
  x: number; y: number;
  localX: number; localY: number;
}

export interface DragStartInfo {
  x: number; y: number;
  localX: number; localY: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface DragUpdateInfo {
  x: number; y: number;
  localX: number; localY: number;
  dx: number; dy: number;
  primaryDelta?: number;
}

export interface DragEndInfo {
  x: number; y: number;
  localX: number; localY: number;
  vx: number; vy: number;
  primaryVelocity?: number;
}

export interface ScaleStartInfo {
  x: number; y: number;
  localX: number; localY: number;
  pointerCount: number;
  kind?: "touch" | "mouse" | "stylus" | "trackpad";
}

export interface ScaleUpdateInfo {
  x: number; y: number;
  localX: number; localY: number;
  scale: number;
  horizontalScale: number;
  verticalScale: number;
  rotation: number;
  pointerCount: number;
  dx: number; dy: number;
}

export interface ScaleEndInfo {
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
  onTapDown?: (info: TapDownInfo) => void;
  onTapUp?: (info: TapUpInfo) => void;
  onTap?: () => void;
  onTapCancel?: () => void;
  // Secondary tap (right-click)
  onSecondaryTap?: () => void;
  onSecondaryTapDown?: (info: TapDownInfo) => void;
  onSecondaryTapUp?: (info: TapUpInfo) => void;
  onSecondaryTapCancel?: () => void;
  // Tertiary tap (middle-click)
  onTertiaryTapDown?: (info: TapDownInfo) => void;
  onTertiaryTapUp?: (info: TapUpInfo) => void;
  onTertiaryTapCancel?: () => void;
  // Double tap
  onDoubleTapDown?: (info: TapDownInfo) => void;
  onDoubleTap?: () => void;
  onDoubleTapCancel?: () => void;
  // Long press
  onLongPressDown?: (info: LongPressDownInfo) => void;
  onLongPressCancel?: () => void;
  onLongPress?: () => void;
  onLongPressStart?: (info: LongPressStartInfo) => void;
  onLongPressMoveUpdate?: (info: LongPressMoveUpdateInfo) => void;
  onLongPressUp?: () => void;
  onLongPressEnd?: (info: LongPressEndInfo) => void;
  // Secondary long press
  onSecondaryLongPressDown?: (info: LongPressDownInfo) => void;
  onSecondaryLongPressCancel?: () => void;
  onSecondaryLongPress?: () => void;
  onSecondaryLongPressStart?: (info: LongPressStartInfo) => void;
  onSecondaryLongPressMoveUpdate?: (info: LongPressMoveUpdateInfo) => void;
  onSecondaryLongPressUp?: () => void;
  onSecondaryLongPressEnd?: (info: LongPressEndInfo) => void;
  // Tertiary long press
  onTertiaryLongPressDown?: (info: LongPressDownInfo) => void;
  onTertiaryLongPressCancel?: () => void;
  onTertiaryLongPress?: () => void;
  onTertiaryLongPressStart?: (info: LongPressStartInfo) => void;
  onTertiaryLongPressMoveUpdate?: (info: LongPressMoveUpdateInfo) => void;
  onTertiaryLongPressUp?: () => void;
  onTertiaryLongPressEnd?: (info: LongPressEndInfo) => void;
  // Vertical drag
  onVerticalDragDown?: (info: DragDownInfo) => void;
  onVerticalDragStart?: (info: DragStartInfo) => void;
  onVerticalDragUpdate?: (info: DragUpdateInfo) => void;
  onVerticalDragEnd?: (info: DragEndInfo) => void;
  onVerticalDragCancel?: () => void;
  // Horizontal drag
  onHorizontalDragDown?: (info: DragDownInfo) => void;
  onHorizontalDragStart?: (info: DragStartInfo) => void;
  onHorizontalDragUpdate?: (info: DragUpdateInfo) => void;
  onHorizontalDragEnd?: (info: DragEndInfo) => void;
  onHorizontalDragCancel?: () => void;
  // Pan (free drag)
  onPanDown?: (info: DragDownInfo) => void;
  onPanStart?: (info: DragStartInfo) => void;
  onPanUpdate?: (info: DragUpdateInfo) => void;
  onPanEnd?: (info: DragEndInfo) => void;
  onPanCancel?: () => void;
  // Scale (pinch/zoom)
  onScaleStart?: (info: ScaleStartInfo) => void;
  onScaleUpdate?: (info: ScaleUpdateInfo) => void;
  onScaleEnd?: (info: ScaleEndInfo) => void;
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
