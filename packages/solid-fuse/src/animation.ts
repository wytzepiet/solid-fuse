// Animated values: a signal that moves to its target over time instead of
// jumping. Driven by requestAnimationFrame (src/frames.ts), so a value set in
// a frame is drawn in that frame, and nothing ticks while nothing moves.
//
// One engine (createMotion) owns the value, the frame loop, retargeting and
// settling; a `Step` function is the physics. createSpring is the engine with
// a spring step.

import { createEffect, createSignal, getOwner, onCleanup, untrack, type Accessor } from "solid-js";

/** Where a motion is: its value and velocity (units per second). */
export type MotionState = { value: number; velocity: number };

/**
 * The physics of a motion: advance `state` towards `target` by `dt` seconds.
 * Return the new state, or nothing once at rest (the engine then snaps to
 * the target and stops).
 */
export type Step = (state: MotionState, target: number, dt: number) => MotionState | void;

export type MotionSetOptions = {
  /** Jump to the target: no animation, velocity zero. */
  instant?: boolean;
  /** Seconds to wait before moving. Nothing runs while waiting. */
  delay?: number;
  /** Start with this velocity (units per second), e.g. a fling's. */
  velocity?: number;
};

/** Moves the motion to `target`. Resolves "settled" when it comes to rest
 *  there, or "interrupted" when another `set` or a new target replaces it. */
export type MotionSetter = (target: number, options?: MotionSetOptions) => Promise<"settled" | "interrupted">;

export type MotionOptions = {
  /** Start here and move to the first target on mount (the entrance). */
  from?: number;
  /** Seconds to wait before the entrance. */
  delay?: number;
};

// A frame after an idle gap or a long stall would advance the physics by a
// lot at once; past this the motion runs slightly slower instead.
const MAX_DT = 1 / 20;

/**
 * An animated value. `target` is a number, or a function to follow: the
 * motion retargets whenever it changes, keeping its velocity. `set` moves it
 * elsewhere until the followed target changes again.
 */
export function createMotion(
  target: number | (() => number),
  step: Step,
  options: MotionOptions = {},
): [Accessor<number>, MotionSetter] {
  const follow = typeof target === "function" ? target : undefined;
  const first = follow ? untrack(follow) : (target as number);
  const start = options.from ?? first;

  const [value, setValue] = createSignal(start, { ownedWrite: true });
  let state: MotionState = { value: start, velocity: 0 };
  let goal = start;
  let frame = 0;
  let last: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settle: ((how: "settled" | "interrupted") => void) | undefined;
  let alive = true;

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
    frame = 0;
    timer = undefined;
    last = undefined;
  };

  const finish = (how: "settled" | "interrupted") => {
    const done = settle;
    settle = undefined;
    done?.(how);
  };

  const tick = (time: number) => {
    frame = 0;
    if (!alive) return;
    const dt = last === undefined ? 1 / 60 : Math.min((time - last) / 1000, MAX_DT);
    last = time;
    const next = dt > 0 ? step(state, goal, dt) : state;
    if (!next) {
      state = { value: goal, velocity: 0 };
      setValue(goal);
      last = undefined;
      finish("settled");
      return;
    }
    state = next;
    setValue(next.value);
    frame = requestAnimationFrame(tick);
  };

  const set: MotionSetter = (to, o = {}) => {
    finish("interrupted");
    stop();
    goal = to;
    const done = new Promise<"settled" | "interrupted">((resolve) => (settle = resolve));
    const go = () => {
      timer = undefined;
      if (o.instant) {
        state = { value: to, velocity: 0 };
        setValue(to);
        finish("settled");
        return;
      }
      if (o.velocity !== undefined) state = { ...state, velocity: o.velocity };
      frame = requestAnimationFrame(tick);
    };
    if (o.delay && o.delay > 0) timer = setTimeout(go, o.delay * 1000);
    else go();
    return done;
  };

  if (getOwner()) {
    onCleanup(() => {
      alive = false;
      stop();
      finish("interrupted");
    });
  }

  if (follow) {
    let entered = false;
    createEffect(follow, (to) => {
      if (!entered) {
        entered = true;
        if (to !== start || options.delay) set(to, { delay: options.delay });
        return;
      }
      set(to);
    });
  } else if (first !== start) {
    set(first, { delay: options.delay });
  }

  return [value, set];
}

export type SpringConfig = {
  /** Perceived duration in seconds: roughly how long it takes to settle.
   *  Default 0.5. */
  duration?: number;
  /** 0 is no overshoot, up to 1 bounces more; below 0 is slower than
   *  critically damped. Default 0. */
  bounce?: number;
  /** Instead of duration and bounce: spring stiffness (mass 1). */
  stiffness?: number;
  /** With stiffness: damping. */
  damping?: number;
};

/** No overshoot. The default. */
export const smooth: SpringConfig = { duration: 0.5, bounce: 0 };
/** A little overshoot. */
export const snappy: SpringConfig = { duration: 0.5, bounce: 0.15 };
/** Visible bounce. */
export const bouncy: SpringConfig = { duration: 0.5, bounce: 0.3 };

/** Stiffness and damping (mass 1) for a config; duration and bounce map
 *  as SwiftUI's springs do. */
export function springCoefficients(config: SpringConfig = smooth): { stiffness: number; damping: number } {
  if (config.stiffness !== undefined) {
    const stiffness = config.stiffness;
    return { stiffness, damping: config.damping ?? 2 * Math.sqrt(stiffness) };
  }
  const duration = config.duration ?? 0.5;
  const bounce = Math.max(-1, Math.min(config.bounce ?? 0, 1));
  const stiffness = (2 * Math.PI / duration) ** 2;
  const damping = bounce >= 0 ? (4 * Math.PI * (1 - bounce)) / duration : (4 * Math.PI) / (duration * (1 + bounce));
  return { stiffness, damping };
}

/**
 * A spring step. Advances by the exact solution of the damped spring, so it
 * is stable for any frame time: 60 Hz, 120 Hz and a dropped frame give the
 * same motion.
 */
export function spring(config?: SpringConfig): Step {
  const { stiffness: k, damping: c } = springCoefficients(config);
  const w0 = Math.sqrt(k);
  const zeta = c / (2 * w0);
  return ({ value, velocity }, target, dt) => {
    const x0 = value - target;
    const v0 = velocity;
    let x: number;
    let v: number;
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const e = Math.exp(-zeta * w0 * dt);
      const a = x0;
      const b = (v0 + zeta * w0 * x0) / wd;
      const cos = Math.cos(wd * dt);
      const sin = Math.sin(wd * dt);
      x = e * (a * cos + b * sin);
      v = e * ((b * wd - a * zeta * w0) * cos - (a * wd + b * zeta * w0) * sin);
    } else if (zeta === 1) {
      const e = Math.exp(-w0 * dt);
      const b = v0 + w0 * x0;
      x = e * (x0 + b * dt);
      v = e * (b - w0 * (x0 + b * dt));
    } else {
      const s = w0 * Math.sqrt(zeta * zeta - 1);
      const r1 = -zeta * w0 + s;
      const r2 = -zeta * w0 - s;
      const c2 = (v0 - r1 * x0) / (r2 - r1);
      const c1 = x0 - c2;
      const e1 = Math.exp(r1 * dt);
      const e2 = Math.exp(r2 * dt);
      x = c1 * e1 + c2 * e2;
      v = c1 * r1 * e1 + c2 * r2 * e2;
    }
    // At rest: closer than a thousandth of a unit and slower than a hundredth
    // per second. Fine enough for pixels and for 0..1 values like opacity.
    if (Math.abs(x) < 1e-3 && Math.abs(v) < 1e-2) return;
    return { value: target + x, velocity: v };
  };
}

/**
 * A value that springs to its target. Follow a signal:
 *
 * ```ts
 * const [scale] = createSpring(() => (pressed() ? 1.2 : 1));
 * ```
 *
 * or set it: `const [x, setX] = createSpring(0); setX(100)`.
 */
export function createSpring(
  target: number | (() => number),
  config: SpringConfig & MotionOptions = {},
): [Accessor<number>, MotionSetter] {
  return createMotion(target, spring(config), { from: config.from, delay: config.delay });
}

/**
 * Milliseconds since it was created, updated every frame while its owner
 * lives. For motion that is a function of time: spinners, loops, shimmer.
 */
export function createElapsed(): Accessor<number> {
  const [elapsed, setElapsed] = createSignal(0, { ownedWrite: true });
  let start: number | undefined;
  let frame = requestAnimationFrame(function loop(time) {
    start ??= time;
    setElapsed(time - start);
    frame = requestAnimationFrame(loop);
  });
  if (getOwner()) onCleanup(() => cancelAnimationFrame(frame));
  return elapsed;
}

/** `a` at 0, `b` at 1. */
export function lerp(t: number, a: number, b: number): number {
  return a + (b - a) * t;
}

/** A color as `lerpColor` takes it: CSS hex, or 0–255 channels with alpha 0–1. */
export type LerpableColor = string | { r: number; g: number; b: number; a?: number };

function rgba(c: LerpableColor): [number, number, number, number] {
  if (typeof c !== "string") return [c.r, c.g, c.b, c.a ?? 1];
  let h = c.replace(/^#/, "");
  if (h.length <= 4) h = [...h].map((ch) => ch + ch).join("");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1];
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (l: number) => {
  const s = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.max(l, 0) ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, s)) * 255);
};

function toOklab([r, g, b]: number[]): [number, number, number] {
  const lr = toLinear(r!), lg = toLinear(g!), lb = toLinear(b!);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, A, B]: number[]): [number, number, number] {
  const l = (L! + 0.3963377774 * A! + 0.2158037573 * B!) ** 3;
  const m = (L! - 0.1055613458 * A! - 0.0638541728 * B!) ** 3;
  const s = (L! - 0.0894841775 * A! - 1.291485548 * B!) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * The color between `a` (at 0) and `b` (at 1), mixed in OKLab so the middle
 * looks halfway to the eye. Returns `{ r, g, b, a }`, which every `Color`
 * prop takes.
 */
export function lerpColor(t: number, a: LerpableColor, b: LerpableColor): { r: number; g: number; b: number; a: number } {
  const ca = rgba(a);
  const cb = rgba(b);
  const la = toOklab(ca);
  const lb = toOklab(cb);
  const [r, g, bl] = fromOklab([lerp(t, la[0], lb[0]), lerp(t, la[1], lb[1]), lerp(t, la[2], lb[2])]);
  return { r, g, b: bl, a: lerp(t, ca[3], cb[3]) };
}
