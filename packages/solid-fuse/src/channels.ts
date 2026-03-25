// Symmetric channel abstraction for JS ↔ Dart communication.
//
// JS → Dart:  send(channel, data) → fjs.bridge_call
// Dart → JS:  __dispatch(channel, json) → registered handler + auto-flush

type Handler = (data: any) => void;

const _handlers = new Map<string, Handler>();
let _afterDispatch: (() => void) | undefined;

/** Register a handler for Dart → JS messages on this channel. */
export function on(channel: string, handler: Handler) {
  _handlers.set(channel, handler);
}

/** Send a JS → Dart message. */
export function send(channel: string, data: Record<string, any>) {
  fjs.bridge_call({ channel, ...data });
}

/** Register a callback to run after every Dart → JS dispatch (solidFlush + flush). */
export function onAfterDispatch(fn: () => void) {
  _afterDispatch = fn;
}

// Single entry point for Dart → JS messages.
// Accepts a native object (passed via FFI JsValue, no JSON serialization).
(globalThis as any).__dispatch = (channel: string, data: any) => {
  _handlers.get(channel)?.(data);
  _afterDispatch?.();
};
