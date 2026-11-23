import { Icon, Text, type IconData } from "solid-fuse";

/** A slot that takes text or any element. */
export type Label = string | number | JSX.Element;

/** A slot that takes an icon constant (`Icons.home`) or any element. */
export type IconSlot = IconData | JSX.Element;

export function label(v: Label | undefined): JSX.Element | undefined {
  return typeof v === "string" || typeof v === "number" ? <Text>{String(v)}</Text> : v;
}

export function icon(v: IconSlot | undefined, size?: number): JSX.Element | undefined {
  return typeof v === "string" ? <Icon icon={v as IconData} size={size} /> : v;
}
