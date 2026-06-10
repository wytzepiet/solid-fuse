// Color — an immutable value object for the framework's colors.
//
// Storage is sRGB (`r`,`g`,`b` in 0–255, `a` in 0–1) for two reasons: it
// matches Flutter's `Color` so it crosses the bridge with no conversion, and it
// matches `parseColor`'s `{ r, g, b, a }` branch on the Dart side. The fields
// are *public* (own enumerable properties), so a `Color` instance marshals to
// `{ r, g, b, a }` automatically — fjs serializes own props. The operations
// (`mix`/`lighten`/…) live on the *prototype*, so they're invisible to that
// marshalling and never ride the wire. Data serializes; behavior doesn't.
//
// Operations that benefit from a perceptual space (mix, lighten, saturate, hue)
// convert to OKLab/OKLCH internally and back — storage stays sRGB, correctness
// lives in the helpers.

// ── scalar helpers ───────────────────────────────────────────────────────────

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const clamp255 = (x: number) => Math.round(clamp(x, 0, 255));
const clamp01 = (x: number) => clamp(x, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round2 = (x: number) => Math.round(x * 100) / 100;

// ── sRGB gamma ⇄ linear (component in 0–1) ───────────────────────────────────

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

// ── linear sRGB ⇄ OKLab (Björn Ottosson) ─────────────────────────────────────

interface Oklab {
  L: number;
  a: number;
  b: number;
}

function linearToOklab(r: number, g: number, b: number): Oklab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToLinear({ L, a, b }: Oklab): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// sRGB (0–255) ⇄ OKLab, with a simple gamut clip on the way back.
function rgbToOklab(r: number, g: number, b: number): Oklab {
  return linearToOklab(srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255));
}
function oklabToRgb(lab: Oklab): { r: number; g: number; b: number } {
  const [lr, lg, lb] = oklabToLinear(lab);
  return {
    r: clamp255(linearToSrgb(clamp(lr, 0, 1)) * 255),
    g: clamp255(linearToSrgb(clamp(lg, 0, 1)) * 255),
    b: clamp255(linearToSrgb(clamp(lb, 0, 1)) * 255),
  };
}

// ── OKLab ⇄ OKLCH (polar form: L, chroma, hue°) ──────────────────────────────

function oklchToOklab(L: number, C: number, h: number): Oklab {
  const hr = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(hr), b: C * Math.sin(hr) };
}
function oklabToOklch({ L, a, b }: Oklab): { L: number; C: number; h: number } {
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C: Math.hypot(a, b), h };
}

// ── HSL (h 0–360, s/l 0–100) → sRGB, and hex parsing ─────────────────────────

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: clamp255(255 * f(0)), g: clamp255(255 * f(8)), b: clamp255(255 * f(4)) };
}

function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
  let h = hex.replace(/^#/, "").trim();
  // expand shorthand #RGB / #RGBA → #RRGGBB / #RRGGBBAA
  if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = h.length >= 8 ? (parseInt(h.slice(6, 8), 16) || 0) / 255 : 1;
  return { r, g, b, a };
}

// ── Color ─────────────────────────────────────────────────────────────────────

export class Color {
  // Public sRGB fields — these (and only these) cross the bridge.
  private constructor(
    public readonly r: number,
    public readonly g: number,
    public readonly b: number,
    public readonly a: number = 1,
  ) {}

  // ── construction ──
  static rgb(r: number, g: number, b: number, a = 1): Color {
    return new Color(clamp255(r), clamp255(g), clamp255(b), clamp01(a));
  }
  static hsl(h: number, s: number, l: number, a = 1): Color {
    const { r, g, b } = hslToRgb(h, s, l);
    return new Color(r, g, b, clamp01(a));
  }
  static oklch(l: number, c: number, h: number, a = 1): Color {
    const { r, g, b } = oklabToRgb(oklchToOklab(l, c, h));
    return new Color(r, g, b, clamp01(a));
  }
  static hex(hex: string): Color {
    const { r, g, b, a } = parseHex(hex);
    return new Color(r, g, b, a);
  }

  // ── named constants (Material 500 swatch — parity with the "red"/"blue"… inputs) ──
  static readonly transparent = new Color(0, 0, 0, 0);
  static readonly white = new Color(255, 255, 255);
  static readonly black = new Color(0, 0, 0);
  static readonly red = new Color(244, 67, 54);
  static readonly blue = new Color(33, 150, 243);
  static readonly green = new Color(76, 175, 80);
  static readonly grey = new Color(158, 158, 158);
  static readonly orange = new Color(255, 152, 0);
  static readonly purple = new Color(156, 39, 176);
  static readonly yellow = new Color(255, 235, 59);
  static readonly teal = new Color(0, 150, 136);
  static readonly cyan = new Color(0, 188, 212);
  static readonly amber = new Color(255, 193, 7);
  static readonly indigo = new Color(63, 81, 181);
  static readonly pink = new Color(233, 30, 99);
  static readonly brown = new Color(121, 85, 72);

  // ── operations (prototype methods — never serialized; return new Colors) ──
  withAlpha(a: number): Color {
    return new Color(this.r, this.g, this.b, clamp01(a));
  }
  lighten(amount: number): Color {
    const lch = oklabToOklch(rgbToOklab(this.r, this.g, this.b));
    const { r, g, b } = oklabToRgb(oklchToOklab(clamp01(lch.L + amount), lch.C, lch.h));
    return new Color(r, g, b, this.a);
  }
  darken(amount: number): Color {
    return this.lighten(-amount);
  }
  saturate(amount: number): Color {
    const lch = oklabToOklch(rgbToOklab(this.r, this.g, this.b));
    const { r, g, b } = oklabToRgb(oklchToOklab(lch.L, Math.max(0, lch.C + amount), lch.h));
    return new Color(r, g, b, this.a);
  }
  desaturate(amount: number): Color {
    return this.saturate(-amount);
  }
  rotateHue(deg: number): Color {
    const lch = oklabToOklch(rgbToOklab(this.r, this.g, this.b));
    const { r, g, b } = oklabToRgb(oklchToOklab(lch.L, lch.C, lch.h + deg));
    return new Color(r, g, b, this.a);
  }
  /** Perceptual blend toward `other` in OKLab. `t` 0 → this, 1 → other. */
  mix(other: Color, t = 0.5): Color {
    const A = rgbToOklab(this.r, this.g, this.b);
    const B = rgbToOklab(other.r, other.g, other.b);
    const { r, g, b } = oklabToRgb({ L: lerp(A.L, B.L, t), a: lerp(A.a, B.a, t), b: lerp(A.b, B.b, t) });
    return new Color(r, g, b, lerp(this.a, other.a, t));
  }

  equals(other: Color): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  toString(): string {
    return this.a === 1
      ? `rgb(${this.r}, ${this.g}, ${this.b})`
      : `rgba(${this.r}, ${this.g}, ${this.b}, ${round2(this.a)})`;
  }
}
