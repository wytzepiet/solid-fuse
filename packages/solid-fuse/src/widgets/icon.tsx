import type {
  BaseProps,
  Color,
  FontWeight,
  ShadowInput,
} from "../types";

export interface IconData {
  codePoint: number;
  fontFamily?: string;
  fontPackage?: string;
  matchTextDirection?: boolean;
  fontFamilyFallback?: string[];
}

export interface IconProps extends BaseProps {
  data: IconData;
  color?: Color;
  size?: number;
  semanticLabel?: string;
  // Variable-font axes (Material Symbols, etc.)
  fill?: number;
  weight?: number;
  grade?: number;
  opticalSize?: number;
  // Non-variable font weight (distinct from `weight` above)
  fontWeight?: FontWeight;
  applyTextScaling?: boolean;
  shadows?: ShadowInput | ShadowInput[];
  blendMode?: string;
}

export function Icon(props: IconProps) {
  return <icon {...props} />;
}
