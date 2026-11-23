import { NavigationBar as GNavigationBar, NavigationDestination as GDestination } from "#fuse/material_ui";
import { toHex, type ColorInput } from "solid-fuse";
import { icon, type IconSlot } from "./slots";

export interface NavigationBarProps {
  /** Index of the selected destination. */
  selected: number;
  onSelect?: (index: number) => void;
  /** Default `"alwaysShow"`. */
  labels?: "alwaysShow" | "onlyShowSelected" | "alwaysHide";
  backgroundColor?: ColorInput;
  indicatorColor?: ColorInput;
  /** `NavigationDestination`s. */
  children?: JSX.Element;
}

/** Material's bottom navigation bar. */
export function NavigationBar(props: NavigationBarProps) {
  return (
    <GNavigationBar
      selectedIndex={props.selected}
      onDestinationSelected={props.onSelect ?? null}
      labelBehavior={props.labels ?? null}
      backgroundColor={toHex(props.backgroundColor)}
      indicatorColor={toHex(props.indicatorColor)}
      destinations={props.children}
    />
  );
}

export interface NavigationDestinationProps {
  icon: IconSlot;
  /** Shown while selected. */
  selectedIcon?: IconSlot;
  label: string;
  tooltip?: string;
  disabled?: boolean;
}

export function NavigationDestination(props: NavigationDestinationProps) {
  return (
    <GDestination
      icon={icon(props.icon)!}
      selectedIcon={icon(props.selectedIcon)}
      label={props.label}
      tooltip={props.tooltip}
      enabled={!props.disabled}
    />
  );
}
