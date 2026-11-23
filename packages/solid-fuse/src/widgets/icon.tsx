import { toHex } from "../color";
import type { Const } from "../generated";
import type { BaseProps, ColorInput } from "../types";

/**
 * A glyph of an icon font: a constant from an icon set (`Icons.home` from
 * `@solid-fuse/material`, `CupertinoIcons.heart` from
 * `@solid-fuse/cupertino`), or any `IconData` constant your own
 * `lib/fuse.dart` exports. Constants only: a release build keeps the glyphs
 * the bundle names and drops the rest of the font.
 */
export type IconData = Const<string>;

export interface IconProps extends BaseProps {
  icon: IconData;
  /** Width and height in logical pixels. Default: the ambient icon size (24). */
  size?: number;
  color?: ColorInput;
  /** Accessibility label. */
  semanticLabel?: string;
  /** Variable-font fill axis, 0 to 1 (Material Symbols). */
  fill?: number;
  /** Variable-font weight axis. */
  weight?: number;
  /** Variable-font grade axis. */
  grade?: number;
  /** Variable-font optical size axis. */
  opticalSize?: number;
  /** Scale with the platform text size setting. */
  applyTextScaling?: boolean;
}

/**
 * Renders Flutter's `Icon`. It is the generated `Icon` of
 * `package:flutter/widgets.dart` (solid_fuse's `lib/fuse.dart` exports it),
 * so it decodes the constant the way every generated widget does.
 */
export function Icon(props: IconProps) {
  return (
    <flutter_Icon
      icon={props.icon}
      size={props.size}
      color={toHex(props.color)}
      semanticLabel={props.semanticLabel}
      fill={props.fill}
      weight={props.weight}
      grade={props.grade}
      opticalSize={props.opticalSize}
      applyTextScaling={props.applyTextScaling}
    />
  );
}
