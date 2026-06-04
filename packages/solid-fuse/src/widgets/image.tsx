import type {
  AlignmentString,
  BaseProps,
  BorderRadiusInput,
  BoxFit,
  ColorInput,
  ImageRepeat,
} from "../types";

export interface ImageProps extends BaseProps {
  /**
   * The image to load. Auto-detected from the string:
   * - `http(s)://…` or `//…` → network
   * - `data:…;base64,…` → in-memory bytes
   * - `file://…` or an absolute path (`/…`) → local file
   * - anything else → bundled asset path (`assets/logo.png`)
   */
  src: string;
  /** Override source detection. */
  type?: "network" | "asset" | "file" | "memory";
  /** How the image is inscribed into its box. Defaults to `cover`. */
  fit?: BoxFit;
  width?: number;
  height?: number;
  /** Alignment within its bounds when it doesn't fill them (e.g. with `none`). */
  alignment?: AlignmentString;
  /** Tint colour, blended with the image via `colorBlendMode`. */
  color?: ColorInput;
  /** Blend mode used to combine `color` with the image. Defaults to `srcIn` when `color` is set. */
  colorBlendMode?: string;
  /** How to paint any space not covered by the image. Defaults to `noRepeat`. */
  repeat?: ImageRepeat;
  /** Rounds the corners by clipping the image. */
  borderRadius?: BorderRadiusInput;
  semanticLabel?: string;
  /** Shown while a network image loads. */
  placeholder?: any;
  /** Shown if the image fails to load. */
  errorWidget?: any;
}

export function Image(props: ImageProps) {
  return <image {...props} />;
}
