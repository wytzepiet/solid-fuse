# Animation primitives — consolidated spec

Status: **design, pre-implementation.** Consolidates the decisions made across the
animation design threads (supersedes the framings in `animation-primitives-research.md`
and `…-ecosystem-addendum.md`, which remain as background research). Builds on the
shipped vsync `requestAnimationFrame` (idle-gated) and the shipped `Color` value type.

Next steps after this spec: (2) pressure-test the API by writing the call sites for the
ten canonical animations; (3) spike the integrator on the demo to validate the physics;
(4) implement + docs + demo.

---

## 1. Model

Animation is **signal-driven**: an animated value *is* a Solid signal that moves toward a
target over time instead of jumping. You read it in JSX like any signal; reading it drives
the smallest `FuseNode`'s `ListenableBuilder` rebuild (the same mechanism as Flutter's
`AnimatedBuilder`). No `AnimationController`, no implicit "change state and it animates"
magic — you make *this value* animate, explicitly, and compose the rest.

The guiding idiom is **one driver, derive many**: drive a single normalized progress (or a
single spring) and derive every animated property from it with plain functions/memos.
Coordinated multi-property motion, color transitions, and scrubbing all reduce to this.

This is the opposite of SwiftUI's *implicit* model (mutate state, framework infers what
animates) — chosen deliberately: it's more predictable, composable, and debuggable, and it
fits fine-grained signals (there is no view tree to diff). We keep SwiftUI's *spring feel*
and *config taste*, not its dispatch.

---

## 2. The surface

Three primitives + a lerp family. Most code only ever touches `createSpring`.

| Primitive | Role |
|---|---|
| `createMotion(value, propagate)` | The engine — the animated `createSignal`. Drives a value via a `propagate` function. The foundation + the custom-physics escape hatch. |
| `createSpring(target, config?)` | `createMotion` + a built-in spring `propagate`. The everyday primitive. |
| `createElapsed()` | The rAF clock as a signal. Target-less, time-driven motion (rotation, loops). Sits *beside* `createMotion`, not on top. |
| `lerp` / `lerpColor` / `lerpVec` | Pure interpolation helpers for "one driver, derive many". |

Spring is **the** primitive. `createTween`/curves are deferred — a curve is just a custom
(velocity-blind, fire-and-forget) `propagate`, addable later if real curve-friction shows up.

---

## 3. `createMotion` — the engine

```ts
function createMotion(
  target: number | (() => number),
  propagate: Propagate,
  opts?: { from?: number; delay?: number },
): [Accessor<number>, MotionSetter];

type MotionSetter = (
  target: number,
  opts?: { instant?: boolean; delay?: number; velocity?: number },
) => Promise<"settled" | "interrupted">;
```

**The engine owns everything that isn't the physics:**
- the value signal (read in JSX),
- the position history (`current`, `prevCurrent`) and `target`/`prevTarget`,
- the per-frame rAF loop: each frame, call `propagate(...)`, write the new value, advance the history,
- lifecycle: stop ticking when `propagate` returns `void` (settled → snap to exact target,
  resolve the settle promise, unsubscribe from rAF); resume on retarget,
- idle-gating: subscribed to the rAF loop **only while animating**,
- the derived-writable plumbing (below).

**Scalar.** `createMotion` drives a single `number`. Composite values (vectors, colors) are
*composed* from scalar motions or *derived* via the lerp family — never a generic `T`
converter (§6).

**Derived-writable target.** If `target` is a function, an effect retargets whenever the
source changes — and `set` still works, overriding until the next source change. This is the
`createSignal(() => …)` mirror: a value that *follows* a signal **and** is settable. Rapid
source changes retarget velocity-preservingly (the history carries the velocity).

---

## 4. `propagate` — the integrator seam

The only pluggable part. Pure, scalar, position-based (Verlet-style):

```ts
type Propagate = (
  target: number,
  prevTarget: number,    // advanced extra — most motions ignore it (see below)
  current: number,
  prevCurrent: number,
  dt: number,            // seconds
) => number | void;      // next value, or void when settled
```

- **Velocity is implicit** in the position history: `velocity = (current - prevCurrent) / dt`.
  No explicit velocity state to thread.
- **Time-based, not frame-based.** Velocity is per *second* and advancing multiplies by `dt`,
  so 60 fps and 120 fps produce the *same* motion (120 is just smoother). This is mandatory —
  a frame-based version runs 2× fast at 120 Hz.
- **`void` = settled.** Returning nothing tells the engine the motion is at rest: it snaps the
  value to the exact `target`, resolves the settle promise, and stops ticking (idle-gating).
- **`dt` is clamped on idle-resume.** After an idle gap (backgrounded tab, GC pause) `dt`
  could be huge and blow up a numeric integration; the engine caps it (~32–50 ms — tune in
  the spike). The animation continues slightly time-compressed instead of exploding.
- **`prevTarget`** lets a motion read the target's *own* velocity `(target - prevTarget) / dt`
  — for following a *moving* target without lag. A plain spring ignores it. (Open question:
  keep or drop — §11.)

Built-in spring as a `propagate` (illustrative):

```ts
const spring = ({ stiffness: k, damping: d }) =>
  (target, _pt, current, prevCurrent, dt) => {
    const velocity = (current - prevCurrent) / dt;
    const accel    = (target - current) * k - velocity * d;
    const next     = current + velocity * dt + accel * dt * dt;
    if (Math.abs(target - next) < EPS && Math.abs(velocity) < EPS_V) return; // settled
    return next;
  };
```

A custom `propagate` is the escape hatch for any physics (decay/fling, magnetic snap, a
velocity-blind curve). `createMotion(target, myPropagate)` is fully exposed.

---

## 5. `createSpring` — the everyday primitive

```ts
function createSpring(
  target: number | (() => number),
  config?: SpringConfig,
): [Accessor<number>, MotionSetter];

interface SpringConfig {
  // ── character (persistent — applies to every transition) ──
  bounce?: number;     // 0 = no overshoot · >0 bouncy · <0 overdamped   (default preset = smooth)
  duration?: number;   // perceptual settle time, seconds
  stiffness?: number;  // escape hatch (overrides bounce/duration)
  damping?: number;    // escape hatch
  // ── initial transition (the entrance — one-time) ──
  from?: number;       // seed value; animates from here to `target` on mount
  delay?: number;      // seconds to wait before the entrance starts
}

const smooth, snappy, bouncy: SpringConfig;  // presets (à la SwiftUI)
```

`createSpring(target, config)` = `createMotion(target, spring(config), { from, delay })`.

### The two buckets (this is the rule that removes ambiguity)

| Bucket | Options | Scope |
|---|---|---|
| **How it moves** (character) | `bounce`, `duration` / `stiffness`, `damping` | **persistent** — every transition |
| **Where/when a transition goes** | `target` (1st arg), `from`, `delay` | **per-transition** — the constructor's are the *entrance's*; later ones ride on `set` |

So the constructor's `from`/`delay` configure the entrance **only**; `bounce`/`duration`
persist. A later `set(x, { delay })` carries its own delay. (`from` is inherently one-time —
a retarget has no "from", it goes from wherever it is — which is the tell.)

### Three ways to aim it

```ts
createSpring(1, { from: 0 })                       // entrance: 0 → 1 on mount
createSpring(() => open() ? 1 : 0)                 // follow a signal (enter AND exit)
createSpring(() => brightness(), { from: 0 })      // follow AND have an entrance — only `from` does this
const [v, set] = createSpring(0); /* … */ set(1)   // imperative (set must be in onSettled / a handler — §8)
```

### `set` options

- `set(x)` — animate to `x` (velocity-preserving). Returns `Promise<"settled" | "interrupted">`.
- `set(x, { instant: true })` — snap (jump, zero velocity). Resets, gesture-pin, reduced-motion.
- `set(x, { delay })` — delayed retarget. During the delay the value sits, **no ticks** (idle).
- `set(x, { velocity })` — seed a release velocity (gesture fling); the engine back-computes the
  history so the implicit velocity matches.

Reduced-motion: `set` auto-degrades to `instant` under the OS setting (engine-level); `instant`
stays the explicit always-jump.

---

## 6. Typed animation — color & vector

The motion is always **scalar**. Composite values are composed/derived, **not** a generic `T`.
The deciding question per type: *do the components move independently, or together along a path?*

| Type | Motion | How |
|---|---|---|
| `number` | scalar spring | it *is* the scalar |
| `{x, y}` / size (drag, fling) | **independent** axes | N scalar springs, composed: `transform={{ translateX: x(), translateY: y() }}` |
| `{x, y}` along a fixed path | coupled | one progress spring + `lerpVec(t(), a, b)` |
| `Color` | coupled (always) | one progress spring + `lerpColor(t(), a, b)` (per-channel springs would be wrong) |

Rationale: a signal framework makes composing scalar springs *free*, so the native-composite
machinery that Motor needs (Flutter composition is costly) buys us nothing.

```ts
function lerp(t: number, a: number, b: number): number;
function lerpColor(t: number, a: Color, b: Color): Color;   // OKLab (perceptual)
function lerpVec(t: number, a: Vec2, b: Vec2): Vec2;
```

Pure functions, used in derivations: `const bg = () => lerpColor(t(), Color.white, Color.black)`.
Color animation rides on the shipped `Color` value type. (Open: OKLab straight-line vs OKLCH
hue-arc for hue-rich pairs — §11.)

---

## 7. `createElapsed` — the clock

```ts
function createElapsed(): Accessor<number>;   // monotonic ms; idle-gated (ticks only while observed)
```

For motion that's a pure function of time with **no target** — continuous rotation, marquee,
shimmer, loops. Compose with a memo:

```ts
const t = createElapsed();
<View transform={{ rotate: () => t() * speed }} />   // infinite spinner
```

Not a `createMotion` (a clock never settles, has no target). Distinct shape, same rAF
substrate.

---

## 8. Composition patterns (no extra primitives needed)

- **One driver, derive many** — `const [t] = createSpring(1, { from: 0 })`, then derive
  `opacity={t()}`, `translateY={(1-t()) * 20}`, `scale={0.9 + t()*0.1}`, color via `lerpColor`.
- **Entrance** — `createSpring(target, { from, delay })` (declarative; legal in the body).
- **Follow state** — `createSpring(() => sig())` (enter and exit as the signal flips).
- **Imperative** — `const [v, set] = createSpring(0)`; call `set` from `onSettled`/handlers.
- **Gesture pin + fling** — `onPanUpdate → set(x, { instant })` (track finger), `onPanEnd →
  set(rest, { velocity })` (spring with the throw).
- **Stagger** — `delay` computed from the `<For>` index: `createSpring(1, { from: 0, delay: i()*0.02 })`.
- **Sequence** — `await set(0.5); await set(1)` (settle promise; reads top-to-bottom).
- **Scrub / scroll-progress** — one progress signal, many windowed/derived readers (same as
  one-driver-derive-many, source = scroll instead of a spring).

**No timeline primitive.** `delay` + the settle promise + the scrub recipe cover it; a master
clock fights interruptible retarget, which is our advantage.

---

## 9. Lifecycle & idle-gating

- Built on the shipped vsync rAF: a motion subscribes to the frame loop while animating and
  **self-cancels on settle**. Zero ticks when nothing animates (battery-safe).
- A `delay`'d transition is idle until it starts — no ticks during the wait.
- **+1 frame structural latency** (async bridge can't apply before the synchronous build
  phase): invisible for self-driving motion. Gestures update the value directly (not rAF'd).
  Pixel-pinned input (frame-perfect drag) is out of scope / Dart-side — not v1.

---

## 10. Solid 2.0 constraints

- **No signal writes under a reactive scope** — a setter call in the component body throws.
  So the *imperative* entrance must live in `onSettled` (Solid 2.0's `onMount`) or an event
  handler. The declarative `from` sidesteps this entirely (the engine's writes happen in the
  rAF callback, a settled/async context — legal).
- `onSettled` runs as a leaf owner: create the spring in the body, call `set` inside `onSettled`.
- Derived-writable springs use the function-form `createSpring(() => …)` (the `createSignal`
  mirror).

---

## 11. Scope

**v1 (this spec):** `createMotion`, `createSpring`, `createElapsed`, `lerp`/`lerpColor`/`lerpVec`,
the entrance/follow/imperative ergonomics, `set` options, settle promise, idle-gating.

**Deferred (separable layers — must not block the core):**
- **Presence / exit animation** — needs a renderer deferred-removal protocol (`remove` is
  emitted synchronously today). The known hard gap; its own workstream.
- **Gesture helpers** — beyond raw `set(_, { instant | velocity })`.
- **Scroll-linked** — stays Dart-side (`SliverPersistentHeader`); never a JS spring fed the scroll offset.
- **Named entrance presets** (`fadeInUp`, `pulse`, …) — `@solid-fuse/motion` add-on package.
- **repeat / yoyo** — an infinite loop never settles → pins the vsync loop awake (battery) →
  needs an explicit `stop()` handle. Design later.
- **`createTween` / curves** — add only if curve-friction proves real; it's a custom `propagate`.

---

## 12. Open questions — validate in the spike (step 3)

1. **Default spring feel** + the `{bounce, duration} → {stiffness, damping}` mapping (steal the
   SwiftUI/Motor formula). Which preset is the default (likely `smooth`)?
2. **Integrator**: is position-based/Verlet stable and good-feeling across the range, or do we
   need semi-implicit Euler / an analytic per-step advance? (Verlet was chosen for the clean
   `propagate` interface; confirm it feels right and survives interrupts.)
3. **`dt` clamp** value (32 ms? 50 ms?).
4. **Settle epsilons** (`EPS` position, `EPS_V` velocity) — too tight = never settles; too loose
   = visible snap.
5. **`prevTarget`** — does any real case need it (lag-free moving-target follow), or drop it from
   the `propagate` signature?
6. **`lerpColor`** — OKLab straight line vs OKLCH shortest-hue-arc for hue-rich pairs.
7. **+1 frame latency** — confirm invisible for self-driving motion on the device.
