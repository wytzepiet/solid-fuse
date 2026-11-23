import {
  ActionChip, Badge as GBadge, BadgeCount, Card as GCard, CardFilled, CardOutlined, Chip as GChip,
  CircularProgressIndicator, Divider as GDivider, FilterChip, InkWell, LinearProgressIndicator,
  ListTile as GListTile, VerticalDivider,
} from "#fuse/material_ui";
import { Show } from "solid-js";
import { Dynamic, View, toHex, type ColorInput, type EdgeInsetsInput } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";

export interface CardProps {
  /** Default `"elevated"`. */
  variant?: "elevated" | "filled" | "outlined";
  /** Makes the whole card tappable, with ink. */
  onPress?: () => void;
  padding?: EdgeInsetsInput;
  margin?: number;
  color?: ColorInput;
  elevation?: number;
  children?: JSX.Element;
}

const cards = { elevated: GCard, filled: CardFilled, outlined: CardOutlined };

export function Card(props: CardProps) {
  const body = () => <View padding={props.padding}>{props.children}</View>;
  return (
    <Dynamic
      component={cards[props.variant ?? "elevated"]}
      margin={props.margin}
      color={toHex(props.color)}
      elevation={props.elevation}
      clipBehavior="antiAlias"
    >
      <Show when={props.onPress} fallback={body()}>
        <InkWell onTap={props.onPress}>{body()}</InkWell>
      </Show>
    </Dynamic>
  );
}

export interface ListTileProps {
  title?: Label;
  subtitle?: Label;
  leading?: IconSlot;
  trailing?: IconSlot;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  dense?: boolean;
  /** Give the subtitle room for two lines. */
  threeLine?: boolean;
}

export function ListTile(props: ListTileProps) {
  return (
    <GListTile
      title={label(props.title)}
      subtitle={label(props.subtitle)}
      leading={icon(props.leading)}
      trailing={icon(props.trailing)}
      onTap={props.onPress ?? null}
      onLongPress={props.onLongPress ?? null}
      selected={props.selected}
      enabled={!props.disabled}
      dense={props.dense}
      isThreeLine={props.threeLine}
    />
  );
}

export interface DividerProps {
  /** A vertical line, for rows. */
  vertical?: boolean;
  thickness?: number;
  /** The space it takes, across the line. */
  size?: number;
  indent?: number;
  endIndent?: number;
  color?: ColorInput;
}

export function Divider(props: DividerProps) {
  return (
    <Dynamic
      component={props.vertical ? VerticalDivider : GDivider}
      thickness={props.thickness}
      indent={props.indent}
      endIndent={props.endIndent}
      color={toHex(props.color)}
      width={props.vertical ? props.size : undefined}
      height={props.vertical ? undefined : props.size}
    />
  );
}

export interface ChipProps {
  label: Label;
  icon?: IconSlot;
  /** A filter chip when set: tapping toggles it. */
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  /** An action chip. */
  onPress?: () => void;
  /** Shows a delete button. */
  onDelete?: () => void;
  disabled?: boolean;
}

export function Chip(props: ChipProps) {
  return (
    <Show
      when={props.selected !== undefined}
      fallback={
        <Show
          when={props.onPress}
          fallback={<GChip label={label(props.label)!} avatar={icon(props.icon)} onDeleted={props.onDelete ?? null} />}
        >
          <ActionChip label={label(props.label)!} avatar={icon(props.icon)} onPressed={props.disabled ? null : props.onPress} />
        </Show>
      }
    >
      <FilterChip
        label={label(props.label)!}
        avatar={icon(props.icon)}
        selected={props.selected}
        onSelected={props.disabled ? null : (props.onSelect ?? null)}
        onDeleted={props.onDelete ?? null}
      />
    </Show>
  );
}

export interface BadgeProps {
  /** A number shows as a count (`99+` past `max`); leave out for a dot. */
  label?: Label;
  /** Past this a count shows as `max+`. Default 999. */
  max?: number;
  /** Default true. */
  visible?: boolean;
  color?: ColorInput;
  /** What the badge sits on, usually an icon. */
  children?: JSX.Element;
}

export function Badge(props: BadgeProps) {
  return (
    <Show
      when={typeof props.label === "number"}
      fallback={
        <GBadge label={label(props.label)} isLabelVisible={props.visible ?? true} backgroundColor={toHex(props.color)}>
          {props.children}
        </GBadge>
      }
    >
      <BadgeCount
        count={props.label as number}
        maxCount={props.max}
        isLabelVisible={props.visible ?? true}
        backgroundColor={toHex(props.color)}
      >
        {props.children}
      </BadgeCount>
    </Show>
  );
}

export interface ProgressIndicatorProps {
  /** Default `"circular"`. */
  variant?: "circular" | "linear";
  /** 0 to 1. Leave out for an indeterminate one. */
  value?: number;
  color?: ColorInput;
  trackColor?: ColorInput;
}

export function ProgressIndicator(props: ProgressIndicatorProps) {
  return (
    <Dynamic
      component={props.variant === "linear" ? LinearProgressIndicator : CircularProgressIndicator}
      value={props.value ?? null}
      color={toHex(props.color)}
      backgroundColor={toHex(props.trackColor)}
    />
  );
}
