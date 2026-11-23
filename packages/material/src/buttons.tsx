import {
  ElevatedButton, ElevatedButtonIcon, FilledButton, FilledButtonIcon, FilledButtonTonal,
  FilledButtonTonalIcon, FloatingActionButton as GFab, FloatingActionButtonExtended,
  FloatingActionButtonLarge, FloatingActionButtonSmall, IconButton as GIconButton, IconButtonFilled,
  IconButtonFilledTonal, IconButtonOutlined, OutlinedButton, OutlinedButtonIcon, TextButton, TextButtonIcon,
} from "#fuse/material_ui";
import { Show } from "solid-js";
import { Dynamic, toHex, type ColorInput } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "elevated";

export interface ButtonProps {
  /** Default `"filled"`. */
  variant?: ButtonVariant;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Before the label. */
  icon?: IconSlot;
  autofocus?: boolean;
  /** The label. */
  children?: Label;
}

const plain = { filled: FilledButton, tonal: FilledButtonTonal, outlined: OutlinedButton, text: TextButton, elevated: ElevatedButton };
const withIcon = {
  filled: FilledButtonIcon, tonal: FilledButtonTonalIcon, outlined: OutlinedButtonIcon,
  text: TextButtonIcon, elevated: ElevatedButtonIcon,
};

/** Material's buttons, one component: pick the look with `variant`. */
export function Button(props: ButtonProps) {
  const onPressed = () => (props.disabled ? null : (props.onPress ?? null));
  const onLongPress = () => (props.disabled ? null : (props.onLongPress ?? null));
  return (
    <Show
      when={props.icon !== undefined}
      fallback={
        <Dynamic component={plain[props.variant ?? "filled"]} onPressed={onPressed()} onLongPress={onLongPress()} autofocus={props.autofocus}>
          {label(props.children)}
        </Dynamic>
      }
    >
      <Dynamic
        component={withIcon[props.variant ?? "filled"]}
        onPressed={onPressed()}
        onLongPress={onLongPress()}
        autofocus={props.autofocus}
        icon={icon(props.icon)}
        label={label(props.children) ?? <></>}
      />
    </Show>
  );
}

export interface IconButtonProps {
  icon: IconSlot;
  /** Shown instead of `icon` while `selected`. */
  selectedIcon?: IconSlot;
  /** A toggle button when set. */
  selected?: boolean;
  /** Default `"standard"`. */
  variant?: "standard" | "filled" | "tonal" | "outlined";
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Shown on long press and read by screen readers. */
  tooltip?: string;
  color?: ColorInput;
  size?: number;
}

const iconButtons = { standard: GIconButton, filled: IconButtonFilled, tonal: IconButtonFilledTonal, outlined: IconButtonOutlined };

export function IconButton(props: IconButtonProps) {
  return (
    <Dynamic
      component={iconButtons[props.variant ?? "standard"]}
      icon={icon(props.icon)}
      selectedIcon={icon(props.selectedIcon)}
      isSelected={props.selected}
      onPressed={props.disabled ? null : (props.onPress ?? null)}
      onLongPress={props.disabled ? null : (props.onLongPress ?? null)}
      tooltip={props.tooltip}
      color={toHex(props.color)}
      iconSize={props.size}
    />
  );
}

export interface FloatingActionButtonProps {
  icon?: IconSlot;
  /** Makes it an extended button with text. */
  label?: Label;
  onPress?: () => void;
  /** Default `"regular"`. */
  size?: "small" | "regular" | "large";
  tooltip?: string;
  backgroundColor?: ColorInput;
  foregroundColor?: ColorInput;
}

const fabs = { small: FloatingActionButtonSmall, regular: GFab, large: FloatingActionButtonLarge };

export function FloatingActionButton(props: FloatingActionButtonProps) {
  return (
    <Show
      when={props.label !== undefined}
      fallback={
        <Dynamic
          component={fabs[props.size ?? "regular"]}
          onPressed={props.onPress ?? null}
          tooltip={props.tooltip}
          backgroundColor={toHex(props.backgroundColor)}
          foregroundColor={toHex(props.foregroundColor)}
        >
          {icon(props.icon)}
        </Dynamic>
      }
    >
      <FloatingActionButtonExtended
        onPressed={props.onPress ?? null}
        tooltip={props.tooltip}
        backgroundColor={toHex(props.backgroundColor)}
        foregroundColor={toHex(props.foregroundColor)}
        icon={icon(props.icon)}
        label={label(props.label)!}
      />
    </Show>
  );
}
