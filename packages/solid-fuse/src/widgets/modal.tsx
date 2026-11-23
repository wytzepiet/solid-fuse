import type { AlignmentString, ColorInput } from "../types";

export interface ModalProps {
  /** Shown while true. */
  open: boolean;
  /** Called with false when the user dismisses it (barrier, back, drag). */
  onOpenChange?: (open: boolean) => void;
  /**
   * The route type. Core has `"dialog"`; design packages add theirs
   * (`"materialBottomSheet"`, `"cupertinoActionSheet"`...).
   */
  type?: string;
  /** Tapping the barrier closes it. Default true. */
  dismissible?: boolean;
  barrierColor?: ColorInput;
  barrierLabel?: string;
  /** Where a dialog sits. Default center. */
  alignment?: AlignmentString;
  duration?: number;
  /** Show above every navigator, not only the nearest. Default true. */
  useRootNavigator?: boolean;
  children?: JSX.Element;
  [prop: string]: unknown;
}

/**
 * A dialog, sheet or popup, open while `open` is true. The children are
 * its content; core's `"dialog"` gives no surface, so bring one.
 */
export function Modal(props: ModalProps) {
  return <modal {...props} />;
}
