// requestAnimationFrame / cancelAnimationFrame, on Flutter's vsync.
//
// Dart owns the clock (dart/lib/src/frame_clock.dart). While callbacks are
// queued, it calls `_frame` synchronously at the start of every frame with
// that frame's time in ms (Flutter's monotonic frame clock, the units of the
// DOM's rAF). The callbacks run, Solid flushes, and the reply carries the
// ops: the frame draws what its callbacks did.
//
// Callbacks queued during a tick run in the next one. When none are left,
// the reply says so and Dart stops ticking: nothing runs while nothing moves.
//
// In a browser, the browser's own rAF stays: Flutter's web engine draws on
// it too. A callback's ops go to Dart like any other update's.

import { flush } from "solid-js";
import { onSync, send } from "~/channels";
import { inBrowser } from "~/browser";

type FrameCallback = (time: number) => void;

let queue = new Map<number, FrameCallback>();
let nextId = 1;
// Dart is ticking (or has been asked to).
let running = false;

if (!inBrowser) {
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

  onSync("_frame", (data: { t: number }) => {
    const batch = queue;
    queue = new Map();
    for (const cb of batch.values()) {
      try {
        cb(data.t);
      } catch (err) {
        console.error(err);
      }
    }
    // A synchronous reply carries the ops, but nothing else flushes Solid.
    flush();
    running = queue.size > 0;
    return { more: running };
  });
}
