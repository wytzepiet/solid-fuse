import { createSignal, untrack, type Accessor } from "solid-js";
import type { BaseProps, LayoutInput } from "../types";
import type { FocusNode } from "../focus-node";

/** A Pressable's live state, one accessor per flag, for its function child. */
export interface PressState {
  pressed: Accessor<boolean>;
  hovered: Accessor<boolean>;
  focused: Accessor<boolean>;
}

export interface PressableProps extends Omit<BaseProps, "children"> {
  onPress?: () => void;
  onLongPress?: () => void;
  /** Pressed down or let go. Dart only reports it when this is passed. */
  onPressedChange?: (pressed: boolean) => void;
  /** A pointer came over it or left. */
  onHoveredChange?: (hovered: boolean) => void;
  /** Gained or lost keyboard focus (shown as a focus highlight). */
  onFocusedChange?: (focused: boolean) => void;
  disabled?: boolean;
  /** Dims the content while pressed, without a round trip to JS. */
  pressedOpacity?: number;
  /** Read by screen readers. */
  semanticLabel?: string;
  focusNode?: FocusNode;
  autofocus?: boolean;
  layout?: LayoutInput;
  /** Content, or a function of the press state to restyle it inline. */
  children?: JSX.Element | ((state: PressState) => JSX.Element);
}

/**
 * Something the user activates, with no look of its own: tap, long press,
 * Enter or Space when focused, and a button to assistive tech. Build a
 * button by putting a `<View>` inside, styled from `onPressedChange` and
 * friends, or inline from a function child.
 */
export function Pressable(props: PressableProps) {
  const children = untrack(() => props.children);
  if (typeof children !== "function") return <pressable {...props} />;
  const [pressed, setPressed] = createSignal(false);
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const render = children as (state: PressState) => JSX.Element;
  return (
    <pressable
      {...props}
      onPressedChange={(v: boolean) => (setPressed(v), props.onPressedChange?.(v))}
      onHoveredChange={(v: boolean) => (setHovered(v), props.onHoveredChange?.(v))}
      onFocusedChange={(v: boolean) => (setFocused(v), props.onFocusedChange?.(v))}
    >
      {render({ pressed, hovered, focused })}
    </pressable>
  );
}
