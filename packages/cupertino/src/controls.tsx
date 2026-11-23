import {
  CupertinoActivityIndicator, CupertinoButton, CupertinoButtonFilled, CupertinoButtonTinted,
  CupertinoCheckbox, CupertinoRadio, CupertinoSlider, CupertinoSwitch,
} from "#fuse/cupertino_ui";
import { For, Show } from "solid-js";
import { Dynamic, View, toHex, type ColorInput } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";

export interface ButtonProps {
  /** Default `"plain"`. */
  variant?: "plain" | "tinted" | "filled";
  /** Default `"large"`. */
  size?: "small" | "medium" | "large";
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  color?: ColorInput;
  /** Before the label, or alone. */
  icon?: IconSlot;
  /** The label. */
  children?: Label;
}

const buttons = { plain: CupertinoButton, tinted: CupertinoButtonTinted, filled: CupertinoButtonFilled };

/** iOS buttons, one component: pick the look with `variant`. */
export function Button(props: ButtonProps) {
  return (
    <Dynamic
      component={buttons[props.variant ?? "plain"]}
      sizeStyle={props.size ?? "large"}
      onPressed={props.disabled ? null : (props.onPress ?? null)}
      onLongPress={props.disabled ? null : (props.onLongPress ?? null)}
      color={toHex(props.color)}
    >
      <Show when={props.icon !== undefined} fallback={label(props.children)}>
        <View flex={{ direction: "horizontal", gap: 6, align: "center" }}>
          {icon(props.icon)}
          {label(props.children)}
        </View>
      </Show>
    </Dynamic>
  );
}

export interface SwitchProps {
  value: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  color?: ColorInput;
}

export function Switch(props: SwitchProps) {
  return (
    <CupertinoSwitch
      value={props.value}
      onChanged={props.disabled ? null : (props.onChange ?? null)}
      activeTrackColor={toHex(props.color)}
    />
  );
}

export interface CheckboxProps {
  value: boolean | null;
  onChange?: (value: boolean | null) => void;
  tristate?: boolean;
  disabled?: boolean;
  color?: ColorInput;
  semanticLabel?: string;
}

export function Checkbox(props: CheckboxProps) {
  return (
    <CupertinoCheckbox
      value={props.value}
      tristate={props.tristate ?? props.value === null}
      onChanged={props.disabled ? null : (props.onChange ?? null)}
      activeColor={toHex(props.color)}
      semanticLabel={props.semanticLabel}
    />
  );
}

export interface RadioProps<T> {
  value: T;
  disabled?: boolean;
  toggleable?: boolean;
  /** A checkmark instead of a dot. */
  checkmark?: boolean;
  color?: ColorInput;
}

/** A radio button. Put it in a core `<RadioGroup value onChange>`. */
export function Radio<T extends string | number | boolean>(props: RadioProps<T>) {
  return (
    <CupertinoRadio
      value={props.value}
      enabled={!props.disabled}
      toggleable={props.toggleable}
      useCheckmarkStyle={props.checkmark}
      activeColor={toHex(props.color)}
    />
  );
}

export interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  steps?: number;
  disabled?: boolean;
  color?: ColorInput;
}

export function Slider(props: SliderProps) {
  return (
    <CupertinoSlider
      value={props.value}
      onChanged={props.disabled ? null : (props.onChange ?? null)}
      onChangeEnd={props.onChangeEnd ?? null}
      min={props.min}
      max={props.max}
      divisions={props.steps ?? null}
      activeColor={toHex(props.color)}
    />
  );
}

export interface ActivityIndicatorProps {
  /** Default true. */
  animating?: boolean;
  /** Default 10. */
  radius?: number;
  color?: ColorInput;
}

export function ActivityIndicator(props: ActivityIndicatorProps) {
  return <CupertinoActivityIndicator animating={props.animating} radius={props.radius} color={toHex(props.color)} />;
}

export interface SegmentedControlProps<T> {
  value: T | undefined;
  onChange?: (value: T) => void;
  /** One segment per option. */
  options: { value: T; label: Label | IconSlot; disabled?: boolean }[];
  /** Segments as wide as their labels instead of equal. */
  proportional?: boolean;
  backgroundColor?: ColorInput;
  thumbColor?: ColorInput;
}

/** iOS's sliding segmented control. */
export function SegmentedControl<T extends string | number | boolean>(props: SegmentedControlProps<T>) {
  return (
    <cupertinoSegmentedControl
      value={props.value}
      onChange={props.onChange}
      values={props.options.map((o) => o.value)}
      disabledValues={props.options.filter((o) => o.disabled).map((o) => o.value)}
      proportionalWidth={props.proportional}
      backgroundColor={props.backgroundColor}
      thumbColor={props.thumbColor}
    >
      <For each={props.options}>{(o) => label(o.label as Label)}</For>
    </cupertinoSegmentedControl>
  );
}
