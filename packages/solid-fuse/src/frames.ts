// requestAnimationFrame / cancelAnimationFrame, on Flutter's vsync.
//
// Dart owns the clock (dart/lib/src/frame_clock.dart). While callbacks are
// queued it ticks JS once per frame with that frame's time in ms (Flutter's
// monotonic frame clock, the units of the DOM's rAF). Two ways:
//
// - `_frame` (default): sent after frame N with the time frame N+1 will
//   have, so JS works while Dart carries on between frames. If the tick is
//   still running at vsync N+1, Dart holds the frame with `_frameWait`, a
//   synchronous call that runs once the tick is done and brings its ops.
//   Either way frame N+1 draws what JS computed for it.
// - `_frameSync`: a synchronous call at the start of frame N; Dart waits for
//   all of it.
//
// Callbacks queued during a tick run in the next one. When none are left,
// the reply says so and Dart stops ticking: nothing runs while nothing moves.

import { flush } from "solid-js";
import { on, onSync, send } from "~/channels";

type FrameCallback = (time: number) => void;

let queue = new Map<number, FrameCallback>();
let nextId = 1;
// Dart is ticking (or has been asked to).
let running = false;

globalThis.requestAnimationFrame = (cb: FrameCallback): number => {
  const id = nextId++;
  queue.set(id, cb);
  if (!running) {
    running = true;
    send("_frames", { op: "start" });
  }
  return id;
};

globalThis.cancelAnimationFrame = (id: number): void => {
  queue.delete(id);
};

function tick(time: number): { more: boolean } {
  const batch = queue;
  queue = new Map();
  for (const cb of batch.values()) {
    try {
      cb(time);
    } catch (err) {
      console.error(err);
    }
  }
  running = queue.size > 0;
  return { more: running };
}

// The channel dispatcher flushes Solid and the ops after an async handler.
on("_frame", (data: { t: number }) => tick(data.t));

// A synchronous reply carries the ops, but nothing flushes Solid for it.
onSync("_frameSync", (data: { t: number }) => {
  const r = tick(data.t);
  flush();
  return r;
});

// Runs after the tick in flight (JS runs one thing at a time); its reply
// brings the ops Dart hasn't applied yet.
onSync("_frameWait", () => {
  flush();
  return { more: running };
});
