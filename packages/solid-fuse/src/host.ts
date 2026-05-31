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

// Seeded by the Dart engine before any user code runs (see engine.dart). If it's
// missing, we're not inside a running solid-fuse app — fail loudly rather than
// guess a wrong platform/mode.
const seed = (globalThis as any).__fuseHost as
  | { mode: BuildMode; platform: Platform; brightness: Brightness }
  | undefined;
if (!seed) {
  throw new Error(
    "[solid-fuse] `host` is unavailable — it only exists inside a running solid-fuse app.",
  );
}

const [brightness, setBrightness] = createSignal<Brightness>(seed.brightness);

// Dart pushes OS theme changes here (WidgetsBindingObserver.didChangePlatformBrightness).
on("_brightness", (data: { value: Brightness }) => setBrightness(data.value));

/** The `host` namespace: ambient, read-only facts the native host reports about
 * itself. Reactive members are accessors; static members are plain values. */
export interface Host {
  /** System appearance — reactive; updates when the OS light/dark setting changes. */
  brightness: () => Brightness;
  /** Target platform — static for the session. */
  platform: Platform;
  /** Build mode — static for the session. */
  mode: BuildMode;
}

export const host: Host = {
  brightness,
  platform: seed.platform,
  mode: seed.mode,
};
