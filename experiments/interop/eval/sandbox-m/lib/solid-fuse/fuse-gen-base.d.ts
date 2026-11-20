// Hand-written companion to the generated .d.ts files (not generated).
// In the real package these would come from solid-fuse's own types.

/** A rendered JSX node (solid-fuse's FuseNode), or anything Solid can insert. */
export type FuseElement = { readonly __fuseNode: true } | (() => FuseElement);
export type FuseText = string | number | (string | number)[];
export type FuseChildren = FuseElement | FuseText | null | undefined | boolean | FuseChildren[];

/** A JS-side handle whose node owns a Dart object of type T (see creating-handles). */
export interface FuseHandle<T extends string = string> {
  readonly node: FuseElement;
  readonly __dart?: T;
}

export interface FuseFlex {
  direction?: "horizontal" | "vertical";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly";
  expand?: boolean;
}

export interface FuseGenBaseProps {
  ref?: FuseElement | ((el: FuseElement) => void);
}

export type NamedColor =
  | "red" | "blue" | "green" | "white" | "black" | "grey"
  | "orange" | "purple" | "yellow" | "teal" | "cyan" | "amber"
  | "indigo" | "pink" | "brown" | "transparent";

/** solid-fuse's existing nice colour input (hex is CSS order: #RRGGBBAA). */
export type ColorInput =
  | NamedColor
  | `#${string}`
  | { r: number; g: number; b: number; a?: number }
  | { h: number; s: number; l: number; a?: number };
