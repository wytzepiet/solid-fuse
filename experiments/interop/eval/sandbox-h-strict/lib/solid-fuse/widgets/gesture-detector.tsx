import type { BaseProps, FlexInput } from "../types";

export type PointerDevice = "touch" | "mouse" | "stylus" | "trackpad";

export interface TapDownDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind?: PointerDevice;
}

export interface TapUpDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind: PointerDevice;
}

export interface LongPressDownDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind?: PointerDevice;
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
  kind?: PointerDevice;
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
  kind?: PointerDevice;
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

export interface GestureDetectorProps extends BaseProps {
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

export function GestureDetector(props: GestureDetectorProps) {
  return <gestureDetector {...props} />;
}
