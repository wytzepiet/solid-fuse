/**
 * Whether the app runs in a browser (a web build): Flutter's web engine and
 * the bundle share one global scope there, and the browser has the real
 * `requestAnimationFrame`, `URL`, `console` and the rest. What fills in for
 * QuickJS (polyfills.ts, frames.ts) must leave them alone, or the engine
 * would schedule its frames on fuse's clock, which waits for its frames.
 */
export const inBrowser: boolean = (globalThis as any).__fuseHost?.platform === "web";
