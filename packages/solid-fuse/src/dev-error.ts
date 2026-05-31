// Dev-only error reporting: ship JS errors over the channel to Dart, which
// forwards them to the Vite plugin. Vite symbolicates against its module
// graph and prints a nice trace to the terminal where `fuse dev` is running.
// The app keeps running — HMR can fix and recover without a restart,
// matching Vite's browser behaviour.
//
// With no dev server reachable (release/profile builds) we fall back to
// console.error and the app continues.

/**
 * Fire-and-forget: POST the error to the Vite dev plugin. Dart sets
 * `globalThis.__fuseDevServer` at startup so we know where to send.
 * Never throws — we'd rather lose the report than infinite-loop on the
 * reporting path itself.
 */
export function reportDevError(err: unknown): void {
  const base = (globalThis as any).__fuseDevServer as string | undefined;
  if (!base) {
    console.error(err);
    return;
  }
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    // Solid 2.0 wraps the original throw in a StatusError and attaches the
    // original via `.cause`. The wrapping can nest — @solidjs/signals and
    // @solidjs/universal each bundle their own StatusError class, so an
    // error from one is treated as foreign by the other and re-wrapped.
    // Walk to the bottom: that's where setSignal / the user's compute fn
    // actually threw.
    // Solid 2.0 wraps errors in StatusError; @solidjs/signals and
    // @solidjs/universal each bundle their own class, so an error from one
    // is foreign to the other and gets re-wrapped. The original setSignal
    // / accessor throw lives at the bottom of the cause chain.
    const root = unwrapCause(e);
    const causeStack =
      root !== e && typeof root.stack === "string" ? root.stack : undefined;
    fetch(`${base}/__fuse_error`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: e.message,
        stack: e.stack ?? "",
        causeStack,
      }),
    }).catch(() => console.error(err));
  } catch {
    console.error(err);
  }
}

/** Walk `err.cause` chain to its bottom Error. Stops on cycles or non-Errors. */
function unwrapCause(err: Error): Error {
  const seen = new Set<unknown>([err]);
  let cur: Error = err;
  while (true) {
    const next = (cur as { cause?: unknown }).cause;
    if (!(next instanceof Error) || seen.has(next)) return cur;
    seen.add(next);
    cur = next;
  }
}
