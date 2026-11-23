import {
  CupertinoListSection, CupertinoListSectionInsetGrouped, CupertinoListTile, CupertinoListTileChevron,
} from "#fuse/cupertino_ui";
import { Dynamic, toHex, type ColorInput } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";

export interface ListSectionProps {
  header?: Label;
  footer?: Label;
  /** Rounded and inset, like iOS Settings. Default true. */
  insetGrouped?: boolean;
  backgroundColor?: ColorInput;
  /** `ListTile`s. */
  children?: JSX.Element;
}

export function ListSection(props: ListSectionProps) {
  return (
    <Dynamic
      component={(props.insetGrouped ?? true) ? CupertinoListSectionInsetGrouped : CupertinoListSection}
      header={label(props.header)}
      footer={label(props.footer)}
      backgroundColor={toHex(props.backgroundColor)}
    >
      {props.children}
    </Dynamic>
  );
}

export interface ListTileProps {
  title: Label;
  subtitle?: Label;
  /** Grey text before the trailing widget, e.g. the current value. */
  additionalInfo?: Label;
  leading?: IconSlot;
  /** Default: a chevron when `onPress` is set. */
  trailing?: IconSlot;
  onPress?: () => void;
  backgroundColor?: ColorInput;
}

export function ListTile(props: ListTileProps) {
  return (
    <CupertinoListTile
      title={label(props.title)!}
      subtitle={label(props.subtitle)}
      additionalInfo={label(props.additionalInfo)}
      leading={icon(props.leading)}
      trailing={props.trailing !== undefined ? icon(props.trailing) : props.onPress ? <CupertinoListTileChevron /> : undefined}
      onTap={props.onPress}
      backgroundColor={toHex(props.backgroundColor)}
    />
  );
}
