import type { ColorInput, NamedColor } from "./types";

// The same values as the Dart side's named colors (dart/lib/src/utils.dart):
// Material's primary swatches.
const named: Record<NamedColor, string> = {
  red: "#f44336",
  blue: "#2196f3",
  green: "#4caf50",
  white: "#ffffff",
  black: "#000000",
  grey: "#9e9e9e",
  orange: "#ff9800",
  purple: "#9c27b0",
  yellow: "#ffeb3b",
  teal: "#009688",
  cyan: "#00bcd4",
  amber: "#ffc107",
  indigo: "#3f51b5",
  pink: "#e91e63",
  brown: "#795548",
  transparent: "#00000000",
};

const hex2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s / 100));
  l = Math.min(1, Math.max(0, l / 100));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Any color input as a CSS hex string (`#rrggbb`, or `#rrggbbaa` when not
 * opaque): the form every component takes, the generated ones included.
 * `undefined` and `null` pass through.
 */
export function toHex(color: ColorInput): `#${string}`;
export function toHex(color: ColorInput | null | undefined): `#${string}` | undefined;
export function toHex(color: ColorInput | null | undefined): `#${string}` | undefined {
  if (color == null) return undefined;
  if (typeof color === "string") {
    if (color.startsWith("#")) return color as `#${string}`;
    const n = named[color.toLowerCase() as NamedColor];
    if (n) return n as `#${string}`;
    throw new Error(`[solid-fuse] unknown color ${JSON.stringify(color)}`);
  }
  const [r, g, b] = "r" in color ? [color.r, color.g, color.b] : hslToRgb(color.h, color.s, color.l);
  const a = color.a ?? 1;
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a >= 1 ? "" : hex2(a * 255)}`;
}
