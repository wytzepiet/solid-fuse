import {
  Checkbox as GCheckbox, Radio as GRadio, Slider as GSlider, Switch as GSwitch,
} from "#fuse/material_ui";
import type { Color } from "#fuse/flutter";


export interface SwitchProps {
  value: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  /** The track's color while on. */
  color?: Color;
}

export function Switch(props: SwitchProps) {
  return (
    <GSwitch
      value={props.value}
      onChanged={props.disabled ? null : (props.onChange ?? null)}
      activeTrackColor={props.color}
    />
  );
}

export interface CheckboxProps {
  /** `null` is the third, mixed state of a `tristate` checkbox. */
  value: boolean | null;
  onChange?: (value: boolean | null) => void;
  /** Cycles through checked, unchecked and mixed (`null`). */
  tristate?: boolean;
  disabled?: boolean;
  /** Shows the error color. */
  error?: boolean;
  color?: Color;
  semanticLabel?: string;
}

export function Checkbox(props: CheckboxProps) {
  return (
    <GCheckbox
      value={props.value}
      tristate={props.tristate ?? props.value === null}
      onChanged={props.disabled ? null : (props.onChange ?? null)}
      isError={props.error}
      activeColor={props.color}
      semanticLabel={props.semanticLabel}
    />
  );
}

export interface RadioProps<T> {
  /** Selected when the enclosing `<RadioGroup>`'s value equals this. */
  value: T;
  disabled?: boolean;
  /** Tapping the selected radio clears the group. */
  toggleable?: boolean;
  color?: Color;
}

/** A radio button. Put it in a core `<RadioGroup value onChange>`. */
export function Radio<T extends string | number | boolean>(props: RadioProps<T>) {
  return (
    <GRadio
      value={props.value}
      enabled={!props.disabled}
      toggleable={props.toggleable}
      activeColor={props.color}
    />
  );
}

export interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  /** When the user lets go. */
  onChangeEnd?: (value: number) => void;
  /** Default 0. */
  min?: number;
  /** Default 1. */
  max?: number;
  /** Snap to this many steps between min and max. */
  steps?: number;
  /** Shown above the thumb while dragging (with `steps`). */
  label?: string;
  disabled?: boolean;
  color?: Color;
}

export function Slider(props: SliderProps) {
  return (
    <GSlider
      value={props.value}
      onChanged={props.disabled ? null : (props.onChange ?? null)}
      onChangeEnd={props.onChangeEnd ?? null}
      min={props.min}
      max={props.max}
      divisions={props.steps ?? null}
      label={props.label ?? null}
      activeColor={props.color}
    />
  );
}
