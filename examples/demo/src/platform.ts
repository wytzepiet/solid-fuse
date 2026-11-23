import { createSignal } from "solid-js";
import type { TargetPlatform } from "#fuse/flutter";

/** The platform the whole demo behaves like. `undefined`: the device's. */
export const [platform, setPlatform] = createSignal<TargetPlatform | undefined>(undefined);
