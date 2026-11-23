import { createSignal, untrack } from "solid-js";
import type { BaseProps, FlexInput } from "../types";
import type { FocusNode } from "../focus-node";

export interface PressState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
}

export interface PressableProps extends BaseProps {
  onPress?: () => void;
  onLongPress?: () => void;
  /** Called when pressed, hovered or focused changes. */
  onStateChange?: (state: PressState) => void;
  disabled?: boolean;
  /** Dims the content while pressed, without a round trip to JS. */
  pressedOpacity?: number;
  /** Read by screen readers. */
  semanticLabel?: string;
  focusNode?: FocusNode;
  autofocus?: boolean;
  flex?: FlexInput;
  /** Content, or a function of the press state to restyle it. */
  children?: JSX.Element | ((state: () => PressState) => JSX.Element);
}

/**
 * Something the user activates, with no look of its own: tap, long press,
 * Enter or Space when focused, and a button to assistive tech. Build a
 * button by putting a `<View>` inside, styled from the press state.
 */
export function Pressable(props: PressableProps) {
  const children = untrack(() => props.children);
  if (typeof children !== "function") return <pressable {...props} />;
  const [state, setState] = createSignal<PressState>({ pressed: false, hovered: false, focused: false });
  const render = children as (state: () => PressState) => JSX.Element;
  return (
    <pressable
      {...props}
      onStateChange={(s: PressState) => {
        setState(s);
        props.onStateChange?.(s);
      }}
    >
      {render(state)}
    </pressable>
  );
}
