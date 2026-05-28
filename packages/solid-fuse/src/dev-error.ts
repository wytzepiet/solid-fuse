// Dev-only error reporting: ship JS errors over the channel to Dart, which
// forwards them to the Vite plugin. Vite symbolicates against its module
// graph and prints a nice trace to the terminal where `fuse dev` is running.
// The app keeps running — HMR can fix and recover without a restart,
// matching Vite's browser behaviour.
//
// In prod (flutterMode === "release") we fall back to console.error and the
// app continues.

/**
 * Fire-and-forget: POST the error to the Vite dev plugin. Dart sets
 * `globalThis.__fuseDevServer` at startup so we know where to send.
 * Never throws — we'd rather lose the report than infinite-loop on the
 * reporting path itself.
 */
export function reportDevError(err: unknown): void {
  if (flutterMode === "release") {
    console.error(err);
    return;
  }
  const base = (globalThis as any).__fuseDevServer as string | undefined;
  if (!base) {
    console.error(err);
    return;
  }
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    fetch(`${base}/__fuse_error`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: e.message, stack: e.stack ?? "" }),
    }).catch(() => console.error(err));
  } catch {
    console.error(err);
  }
}
