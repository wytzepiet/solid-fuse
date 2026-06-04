import type { BaseProps, FlexInput } from "../types";

export type PointerDevice =
  | "touch"
  | "mouse"
  | "stylus"
  | "invertedStylus"
  | "trackpad"
  | "unknown";

/** Fired on down / move / up / hover / cancel. */
export interface PointerDetails {
  x: number; y: number;
  localX: number; localY: number;
  /** Delta since the last pointer event (zero on down/up). */
  dx: number; dy: number;
  kind: PointerDevice;
  /** Bitmask of pressed buttons. */
  buttons: number;
  /** Unique id of the pointer that triggered the event. */
  pointer: number;
  pressure: number;
}

/** Fired on scroll / trackpad signals. */
export interface PointerSignalDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind: PointerDevice;
  /** Scroll delta (only meaningful for scroll signals; zero otherwise). */
  scrollDeltaX: number; scrollDeltaY: number;
}

export interface PointerPanZoomStartDetails {
  x: number; y: number;
  localX: number; localY: number;
  kind: PointerDevice;
  pointer: number;
}

export interface PointerPanZoomUpdateDetails {
  x: number; y: number;
  localX: number; localY: number;
  /** Accumulated pan offset since the gesture started. */
  panX: number; panY: number;
  /** Pan delta since the last update. */
  panDeltaX: number; panDeltaY: number;
  scale: number;
  /** Rotation in radians. */
  rotation: number;
}

export interface PointerPanZoomEndDetails {
  x: number; y: number;
  localX: number; localY: number;
}

export interface ListenerProps extends BaseProps {
  flex?: FlexInput;
  onPointerDown?: (details: PointerDetails) => void;
  onPointerMove?: (details: PointerDetails) => void;
  onPointerUp?: (details: PointerDetails) => void;
  onPointerHover?: (details: PointerDetails) => void;
  onPointerCancel?: (details: PointerDetails) => void;
  onPointerSignal?: (details: PointerSignalDetails) => void;
  onPointerPanZoomStart?: (details: PointerPanZoomStartDetails) => void;
  onPointerPanZoomUpdate?: (details: PointerPanZoomUpdateDetails) => void;
  onPointerPanZoomEnd?: (details: PointerPanZoomEndDetails) => void;
  behavior?: "deferToChild" | "opaque" | "translucent";
}

export function Listener(props: ListenerProps) {
  return <listener {...props} />;
}
