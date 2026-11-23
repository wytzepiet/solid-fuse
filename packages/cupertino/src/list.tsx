import {
  CupertinoListSection, CupertinoListSectionInsetGrouped, CupertinoListTile, CupertinoListTileChevron,
} from "#fuse/cupertino_ui";
import { Dynamic } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";
import type { Color } from "#fuse/flutter";

export interface ListSectionProps {
  header?: Label;
  footer?: Label;
  /** Rounded and inset, like iOS Settings. Default true. */
  insetGrouped?: boolean;
  backgroundColor?: Color;
  /** `ListTile`s. */
  children?: JSX.Element;
}

export function ListSection(props: ListSectionProps) {
  return (
    <Dynamic
      component={(props.insetGrouped ?? true) ? CupertinoListSectionInsetGrouped : CupertinoListSection}
      header={label(props.header)}
      footer={label(props.footer)}
      backgroundColor={props.backgroundColor}
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
  backgroundColor?: Color;
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
      backgroundColor={props.backgroundColor}
    />
  );
}
