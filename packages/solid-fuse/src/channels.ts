// Channels: routed messaging over FJS's raw bridge.
//
// FJS gives us one unrouted pipe in each direction:
//   JS → Dart:  fjs.bridge_call(value)       → Dart `bridge:` callback
//   Dart → JS:  engine.call(module, method)  → a JS module function
//
// We add a channel string as the first field of every message, and dispatch
// to a handler registered via channels.on(channel, ...). FJS already handles
// return values on both sides concurrently (verified: multiple in-flight
// calls don't serialize behind each other), so call() just awaits the FFI
// return — no correlation IDs needed.

type Handler = (data: any) => any | Promise<any>;

const _handlers = new Map<string, Handler>();
let _afterDispatch: (() => void) | undefined;

/** Register a handler for Dart → JS messages on this channel.
 *  The handler's return value flows back to Dart as the call()'s result. */
export function on(channel: string, handler: Handler) {
  _handlers.set(channel, handler);
}

/** Fire-and-forget message JS → Dart. No timer, no waiting on the response. */
export function send(channel: string, data: Record<string, any> = {}) {
  fjs.bridge_call({ channel, ...data });
}

/**
 * RPC-style message JS → Dart. Awaits the registered Dart handler's return
 * value. Rejects with the handler's error (sync throws and async rejections
 * both forwarded by FJS).
 *
 * [timeout] defaults to 30000ms. Pass 0 to disable (for long-running native
 * ops like biometric prompts).
 */
export function call(
  channel: string,
  data: Record<string, any> = {},
  options?: { timeout?: number },
): Promise<any> {
  // Synchronously drain the renderer's op journal before firing the RPC.
  // This is what makes `<widget ref={r => r.doThing()} />` work — without
  // it, the `doThing` bridge_call leaves JS before the microtask-scheduled
  // op flush, and Dart sees the RPC before the node's create op.
  _flushOps?.();
  const timeoutMs = options?.timeout ?? 30000;
  const promise = fjs.bridge_call({ channel, ...data });
  if (timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`channels.call("${channel}") timed out after ${timeoutMs}ms`);
      err.name = "ChannelTimeoutError";
      reject(err);
    }, timeoutMs);
    promise.then(
      (v: any) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: any) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Register a callback to run after every Dart → JS dispatch (solidFlush + flush). */
export function onAfterDispatch(fn: () => void) {
  _afterDispatch = fn;
}

// Renderer registers its op-journal drain here so `call` can flush before
// firing the RPC. Module-local to keep channels/renderer decoupled by
// registration rather than import.
let _flushOps: (() => void) | undefined;
export function _setFlushOps(fn: () => void) {
  _flushOps = fn;
}

// Single entry point for Dart → JS messages.
// Returns the handler's result so Dart's engine.call can await it.
(globalThis as any).__dispatch = async (channel: string, data: any) => {
  const h = _handlers.get(channel);
  try {
    const result = h ? await h(data) : undefined;
    _afterDispatch?.();
    return result;
  } catch (err) {
    _afterDispatch?.();
    throw err;
  }
};

/** Grouped export — preferred public API. */
export const channels = { send, call, on };
