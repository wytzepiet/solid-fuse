import { createHandle } from "./handle";
import type { Fakeable } from "./generated";

/** What a fake of `T` gives: any of its members. */
export type FakeOf<T> = T extends Fakeable<infer M> ? Partial<M> : never;

/**
 * Stands in for a native capability: puts `impl` in place of the shared
 * instance of [target], a plugin's platform interface (`GeolocatorPlatform`)
 * that `fuse gen` generated. Every call to the plugin, from JS or from Dart,
 * goes to the function of the member's name; a member `impl` leaves out goes
 * to the real one.
 *
 * Fakes go in the app's `src/fakes.ts`, which runs only where fakes are on
 * (a headless run, a web preview, tests), never in a phone build. Returns a
 * function that puts the real instance back.
 */
export function fake<T extends Fakeable<any>>(target: T, impl: FakeOf<T>): () => void {
  const handle = createHandle(target.$fake, impl as Record<string, unknown>);
  // A node JS lets go of is disposed (renderer.ts), and the fake must stay
  // until it is restored. A module's variables are no root once the bundle
  // has run (nothing may reference this module again), so the set hangs off
  // globalThis. Each evaluation of the bundle starts a new one.
  live.add(handle);
  return () => {
    live.delete(handle);
    handle.dispose();
  };
}

const live: Set<object> = ((globalThis as any).__fuseFakes = new Set<object>());
