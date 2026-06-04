// Ambient, read-only facts about the running app — consolidated from Flutter's
// scattered sources (build mode, target platform, system brightness, and the
// view's media-query metrics) into one namespace. Nothing here touches
// Material/Cupertino, so it's safe across the material/cupertino package split.
//
// Reactive members are accessors (call them inside a tracking scope); static
// members are plain values fixed for the session.
//
// The media-query metrics are each their own signal, so they update
// independently: showing the keyboard moves `viewInsets` without invalidating
// consumers of `size`, a rotation moves `size` without touching `textScaleFactor`,
// and so on. The signals use value-equality so a metrics push that leaves one
// field unchanged is a no-op for that field's subscribers.

import { createSignal } from "solid-js";
import { on } from "./channels";

export type Brightness = "light" | "dark";
export type Platform =
  | "android"
  | "ios"
  | "macos"
  | "windows"
  | "linux"
  | "fuchsia"
  | "web";
export type BuildMode = "debug" | "profile" | "release";
export type Orientation = "portrait" | "landscape";

/** Logical-pixel dimensions of the view. */
export interface Size {
  width: number;
  height: number;
}

/** Logical-pixel insets on each edge (mirrors Flutter's `EdgeInsets`). */
export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The view's media-query metrics, as seeded and pushed by the Dart engine. */
interface Metrics {
  width: number;
  height: number;
  devicePixelRatio: number;
  padding: EdgeInsets;
  viewInsets: EdgeInsets;
  viewPadding: EdgeInsets;
  textScaleFactor: number;
}

// Seeded by the Dart engine before any user code runs (see engine.dart). If it's
// missing, we're not inside a running solid-fuse app — fail loudly rather than
// guess a wrong platform/mode.
const seed = (globalThis as any).__fuseHost as
  | {
      mode: BuildMode;
      platform: Platform;
      brightness: Brightness;
      metrics: Metrics;
    }
  | undefined;
if (!seed) {
  throw new Error(
    "[solid-fuse] `host` is unavailable — it only exists inside a running solid-fuse app.",
  );
}

const [brightness, setBrightness] = createSignal<Brightness>(seed.brightness);

// Dart pushes OS theme changes here (WidgetsBindingObserver.didChangePlatformBrightness).
on("_brightness", (data: { value: Brightness }) => setBrightness(data.value));

const sizeEquals = (a: Size, b: Size) =>
  a.width === b.width && a.height === b.height;
const insetsEquals = (a: EdgeInsets, b: EdgeInsets) =>
  a.top === b.top &&
  a.right === b.right &&
  a.bottom === b.bottom &&
  a.left === b.left;

const m = seed.metrics;
const [size, setSize] = createSignal<Size>(
  { width: m.width, height: m.height },
  { equals: sizeEquals },
);
const [devicePixelRatio, setDevicePixelRatio] = createSignal(m.devicePixelRatio);
const [padding, setPadding] = createSignal(m.padding, { equals: insetsEquals });
const [viewInsets, setViewInsets] = createSignal(m.viewInsets, {
  equals: insetsEquals,
});
const [viewPadding, setViewPadding] = createSignal(m.viewPadding, {
  equals: insetsEquals,
});
const [textScaleFactor, setTextScaleFactor] = createSignal(m.textScaleFactor);

// Dart pushes view metric changes here (WidgetsBindingObserver.didChangeMetrics
// and .didChangeTextScaleFactor). Each setter has value-equality, so only the
// fields that actually changed notify their subscribers.
on("_metrics", (data: Metrics) => {
  setSize({ width: data.width, height: data.height });
  setDevicePixelRatio(data.devicePixelRatio);
  setPadding(data.padding);
  setViewInsets(data.viewInsets);
  setViewPadding(data.viewPadding);
  setTextScaleFactor(data.textScaleFactor);
});

/** The `host` namespace: ambient, read-only facts the native host reports about
 * itself. Reactive members are accessors; static members are plain values. */
export interface Host {
  /** System appearance — reactive; updates when the OS light/dark setting changes. */
  brightness: () => Brightness;
  /** Target platform — static for the session. */
  platform: Platform;
  /** Build mode — static for the session. */
  mode: BuildMode;
  /** Logical-pixel size of the view — reactive; updates on resize/rotation. */
  size: () => Size;
  /** Number of physical pixels per logical pixel — reactive. */
  devicePixelRatio: () => number;
  /** Safe-area insets (status bar, notch, home indicator) — reactive. */
  padding: () => EdgeInsets;
  /** Insets fully obscured by system UI, chiefly the on-screen keyboard at the
   * bottom — reactive; updates as the keyboard opens and closes. */
  viewInsets: () => EdgeInsets;
  /** Padding before `viewInsets` are applied — the safe area that stays put even
   * while the keyboard is up — reactive. */
  viewPadding: () => EdgeInsets;
  /** Accessibility text scaling factor — reactive. */
  textScaleFactor: () => number;
  /** `"portrait"` or `"landscape"`, derived from `size()` — reactive. */
  orientation: () => Orientation;
}

export const host: Host = {
  brightness,
  platform: seed.platform,
  mode: seed.mode,
  size,
  devicePixelRatio,
  padding,
  viewInsets,
  viewPadding,
  textScaleFactor,
  orientation: () => {
    const s = size();
    return s.width >= s.height ? "landscape" : "portrait";
  },
};
