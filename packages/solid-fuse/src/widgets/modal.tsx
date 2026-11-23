import { Show, createSignal } from "solid-js";
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
 *
 * Like Flutter's `showDialog(builder: ...)`, the content exists only while
 * shown: it is made when `open` turns true and let go once the route has
 * finished closing. The element takes no part in its parent's layout.
 */
export function Modal(props: ModalProps) {
  // Dart reports the route's life: true once pushed, false once it is
  // gone, closing animation included.
  const [live, setLive] = createSignal(false);
  return (
    <modal {...props} onRouteLive={setLive}>
      <Show when={props.open || live()}>{props.children}</Show>
    </modal>
  );
}
