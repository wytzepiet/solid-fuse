// Ambient, read-only facts about the running app — consolidated from Flutter's
// scattered sources (build mode, target platform, system brightness) into one
// namespace. Nothing here touches Material/Cupertino, so it's safe across the
// material/cupertino package split.
//
// Reactive members are accessors (call them inside a tracking scope); static
// members are plain values fixed for the session.

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
/** Width and height in logical pixels. */
export type ViewSize = { width: number; height: number };
/** Edges in logical pixels. */
export type ViewEdges = { left: number; top: number; right: number; bottom: number };

type ViewMetrics = {
  size: ViewSize;
  devicePixelRatio: number;
  padding: ViewEdges;
  viewInsets: ViewEdges;
  viewPadding: ViewEdges;
  textScale: number;
};

// Seeded by the Dart engine before any user code runs (see engine.dart). If it's
// missing, we're not inside a running solid-fuse app — fail loudly rather than
// guess a wrong platform/mode.
const seed = (globalThis as any).__fuseHost as
  | { mode: BuildMode; platform: Platform; brightness: Brightness; view?: Partial<ViewMetrics> }
  | undefined;
if (!seed) {
  throw new Error(
    "[solid-fuse] `host` is unavailable — it only exists inside a running solid-fuse app.",
  );
}

const [brightness, setBrightness] = createSignal<Brightness>(seed.brightness);

// Dart pushes OS theme changes here (WidgetsBindingObserver.didChangePlatformBrightness).
on("_brightness", (data: { value: Brightness }) => setBrightness(data.value));

// Before a view exists (or in a test harness) it reports zeros.
const zero: ViewEdges = { left: 0, top: 0, right: 0, bottom: 0 };
const view: ViewMetrics = {
  size: { width: 0, height: 0 },
  devicePixelRatio: 1,
  padding: zero,
  viewInsets: zero,
  viewPadding: zero,
  textScale: 1,
  ...seed.view,
};

// One signal per metric, compared by value: the keyboard opening changes
// viewInsets and leaves readers of size alone.
const sameEdges = (a: ViewEdges, b: ViewEdges) =>
  a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
const [size, setSize] = createSignal<ViewSize>(view.size, {
  equals: (a, b) => a.width === b.width && a.height === b.height,
});
const [devicePixelRatio, setDevicePixelRatio] = createSignal(view.devicePixelRatio);
const [padding, setPadding] = createSignal<ViewEdges>(view.padding, { equals: sameEdges });
const [viewInsets, setViewInsets] = createSignal<ViewEdges>(view.viewInsets, { equals: sameEdges });
const [viewPadding, setViewPadding] = createSignal<ViewEdges>(view.viewPadding, { equals: sameEdges });
const [textScale, setTextScale] = createSignal(view.textScale);

// Dart pushes view changes here (didChangeMetrics, didChangeTextScaleFactor).
on("_view", (v: ViewMetrics) => {
  setSize(v.size);
  setDevicePixelRatio(v.devicePixelRatio);
  setPadding(v.padding);
  setViewInsets(v.viewInsets);
  setViewPadding(v.viewPadding);
  setTextScale(v.textScale);
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
  /** The app's view in logical pixels — reactive, as `MediaQuery.sizeOf`. */
  size: () => ViewSize;
  /** `"landscape"` when wider than tall — reactive. */
  orientation: () => "portrait" | "landscape";
  /** Physical pixels per logical pixel — reactive. */
  devicePixelRatio: () => number;
  /** Space the system UI covers (status bar, notch), minus what the keyboard covers — reactive. */
  padding: () => ViewEdges;
  /** Space the keyboard covers — reactive. */
  viewInsets: () => ViewEdges;
  /** Space the system UI covers, keyboard or not — reactive. */
  viewPadding: () => ViewEdges;
  /** The system text size: font size 14 shows as `14 * textScale` — reactive. */
  textScale: () => number;
}

export const host: Host = {
  brightness,
  platform: seed.platform,
  mode: seed.mode,
  size,
  orientation: () => (size().width > size().height ? "landscape" : "portrait"),
  devicePixelRatio,
  padding,
  viewInsets,
  viewPadding,
  textScale,
};
