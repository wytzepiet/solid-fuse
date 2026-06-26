# Animation primitives for solid-fuse

*A research-backed recommendation. Surveys Motion, GSAP, Reanimated, SwiftUI/Core Animation, Jetpack Compose, and the Svelte/Solid/Vue reactive-value family — reconciled against an adversarial critique and verified against the actual solid-fuse code.*

---

## 1. Executive take

**The single most important insight:** every animation system we surveyed gets its 60fps from one trick — *writing the animated value outside the framework's render/commit cycle* (Motion writes the DOM without a React render; Reanimated runs the spring on a separate UI runtime; Compose mutates an `Animatable` in-place). **solid-fuse structurally cannot do this.** Verified in `renderer.ts`: the *only* path to a Flutter widget prop is a `setProp` op that crosses the fjs bridge and rebuilds a `ListenableBuilder` Dart-side. **In solid-fuse, the render cycle *is* the bridge.** A JS spring writing `opacity` per frame is N bridge crossings + N rebuilds; the same fade as Flutter's `AnimatedOpacity` is *one* `setProp` (the target) and then zero per-frame traffic while Flutter's own ticker interpolates natively.

The three closest analogs split cleanly on this point. Reanimated and Compose *reimplement* animation in their reactive layer **only because their native primitives are weak** (RN) or because the reactive layer *is* native (Compose). solid-fuse is the opposite case: **Flutter's native animation system is excellent and already on the other side of the bridge.** The lesson to steal from Reanimated is therefore the *inverse* of its own design: where it could not delegate, we can and should.

**Recommendation.** Lead with a thin **implicit-animation layer that delegates to Flutter** (`AnimatedOpacity`/`AnimatedContainer`/`AnimatedSize`/`AnimatedSwitcher`/`Hero` — driven by setting a *target* prop + `duration` + `curve`, exactly the shape `SliverAnimatedOpacity` already ships). This is the *default* users reach for and costs zero per-frame bridge traffic. Add **`createSpring`/`createTween` accessor primitives** (Svelte/Compose/Solid-primitives shape, signal-in → accessor-out, read in JSX) as the **power tool, scoped narrowly** to motion that is *continuously coupled to an arbitrary JS signal Flutter can't read* (WebSocket-driven, multi-signal math, physics) plus the **gesture-release fling**. Build the spring as an **analytic integrator sampled against the monotonic rAF timestamp** that **self-cancels on settle** (idle-gating is a hard contract here, not a nicety). Treat **enter/exit as a separate, harder problem** that needs a **core protocol change** (deferred removal), not just an API. Both surfaces expose their mechanism (a signal you read, or a target prop you set) — no `<motion.div>` magic, matching the no-magic preference.

---

## 2. The landscape, distilled

| System | Paradigm | Core primitive shape | Spring model | Enter/exit | Orchestration | Interruption |
|---|---|---|---|---|---|---|
| **Motion** (Framer) | dual: declarative `animate=` + reactive `MotionValue` | `<motion.div>` wrapper **+** `useMotionValue`/`useSpring` (signal-like) | dual: `{duration,bounce}` *or* `{stiffness,damping,mass}`; physics path carries velocity | `<AnimatePresence>` wrapper, stable keys, defers unmount | `transition` obj + `stagger()` + imperative `animate()` timeline | velocity-preserving retarget (physics path); `.jump()` to opt out; **layout/FLIP *not* interruptible** |
| **GSAP** | imperative timeline | `gsap.to()` → Tween; `gsap.timeline()` | **none** — duration + named eases; `elastic`/`back` fake springs | none (manual `onComplete`→remove) | **best-in-class** Timeline + position params | `overwrite:'auto'`; **no velocity preservation** (restarts at v=0) |
| **Reanimated** | reactive cells + animated assignment | `useSharedValue` + `sv.value = withSpring(t)` | dual: `{mass,stiffness,damping}` *or* `{duration,dampingRatio}` | `entering`/`exiting`/`layout` **props**, no wrapper, defers unmount | function composition: `withSequence`/`withRepeat`/`withDelay` | **excellent** — retarget preserves pos+velocity; `withDecay` fling; explicit velocity handoff |
| **SwiftUI / Core Animation** | declarative-reactive value-driven | `.animation(_:value:)` / `withAnimation{}`; `Spring` value type | `{duration,bounce}` + presets `.smooth`/`.snappy`/`.bouncy` | `.transition()` + `matchedGeometryEffect` (hero) | `PhaseAnimator` / `KeyframeAnimator` (per-property tracks) | **additive + velocity-preserving** (the gold standard); auto gesture-velocity tracking |
| **Jetpack Compose** | declarative-reactive over native widgets | **`animateFloatAsState(target) → State<T>`** | normalized `{dampingRatio, stiffness}` (no mass) + named presets | `AnimatedVisibility`/`AnimatedContent` wrappers, defer unmount | `updateTransition` (state→many props) + spec `delay`/`repeat` + coroutines | **automatic** retarget from live value+velocity; `Animatable` + `animateDecay` |
| **Svelte / Solid-primitives / Vue** | declarative-reactive value-driven | **`const [v,set]=createSpring(init)` → Accessor** | normalized `{stiffness,damping}` 0..1 (opaque); VueUse adds `{duration,bounce}` | none (delegate to `<Presence>`/transitions) | emergent: Promise-returning `.set()` + `await` | velocity-preserving retarget default; `instant` (pin) / `preserveMomentum` (fling) |

**Three dominant archetypes:**

- **A. Reactive-value accessor** — `target signal in → animating accessor out`, read in JSX. (Compose `animate*AsState`, Svelte `Spring`, Solid-primitives `createSpring`, Reanimated `sharedValue`+`withSpring`, Motion `MotionValue`.) *This is the signal-native one and maps onto solid-fuse with zero paradigm friction.*
- **B. Declarative wrapper component** — `<motion.div animate={}>`, `AnimatedVisibility`. Hides the value behind a prop-bag. *Convenient, but "magic," and clashes with the no-magic preference.*
- **C. Imperative timeline** — GSAP `timeline()`, Motion `animate()`. Owns the value externally; a parallel source of truth that *fights* a signal graph. *Useful only as a vocabulary donor (eases, position params).*

Compose and the Svelte/Solid family (archetype A) are the closest fit — but **both reason about a fast in-process reactive system. solid-fuse is bridged.** That single fact reshapes every recommendation below.

---

## 3. The two archetypes mapped to solid-fuse

### (a) The reactive-value accessor primitive

The signal-native shape. Verified against `@solid-primitives/spring` — it ports *structurally* with zero friction, but **do not just adopt it**: it inherits Svelte's opaque, framerate-coupled `0..1` coefficients, which the research and the code both say to reject.

```ts
// createSpring — signal-in, accessor-out. Read value() in JSX → granular rebuild.
type SpringOpts =
  | { duration?: number; bounce?: number }        // ergonomic default (Apple/Motion)
  | { preset: "smooth" | "snappy" | "bouncy" }    // tokens
  | { stiffness: number; damping: number };       // power-user escape hatch

interface SpringSetOpts {
  /** carry current velocity into the new target (default true) */
  velocity?: number;
  /** teleport: zero velocity, no animation — for drag-pin handoff */
  instant?: boolean;
}

// Imperative-target form (target comes from logic / a gesture release)
function createSpring(
  initial: number,
  opts?: SpringOpts,
): [get: () => number, set: (target: number, o?: SpringSetOpts) => Promise<void>, velocity: () => number];

// Derived form (smooth an existing signal) — the most-loved ergonomic
function createDerivedSpring(source: () => number, opts?: SpringOpts): () => number;

// Tween (duration + Flutter curve name; curve math delegated to Dart's parseCurve)
function createTween(source: () => number, opts: { duration: number; curve?: CurveName }): () => number;
```

```tsx
// Usage — the mechanism is fully visible: a signal you read.
const [scale, springTo] = createSpring(1, { preset: "snappy" });
<View transform={{ scale: scale() }} />;        // reads scale() → rebuilds only this View
springTo(1.4);                                   // retargets from live value + velocity
```

**Why it fits:** `State<T> === Solid Accessor`; reading `scale()` in one `<View>` rebuilds only that `FuseNode` (granular reactivity already proven at ~64 props/767µs). It exposes its mechanism perfectly — no brand, no wrapper, no auto-propagation. **The catch the critique nails:** this is a per-frame `setProp` stream across the bridge. For a *plain* scale-to with a fixed target, that's strictly worse than delegating. So this primitive earns its keep **only when the target is itself a live arbitrary signal** Flutter cannot see.

### (b) The declarative wrapper / implicit-animation layer

Two sub-flavours. The **value-magic wrapper** (`<motion.div animate={}>`) — *reject for core*: it hides the reactive value behind a prop-bag, the opposite of the author's preference. The **implicit-animation delegation wrapper** — *this is the one to build*, and `SliverAnimatedOpacity` is already a working instance of it:

```tsx
// Implicit animation = set a TARGET prop + duration/curve. Flutter interpolates.
// ZERO per-frame bridge traffic. This is `animateFloatAsState` done the cheap way.
<View
  animate={{ duration: 250, curve: "easeOutCubic" }}  // opt-in implicit animation
  opacity={open() ? 1 : 0}                              // target — set once per state change
  width={open() ? 320 : 0}
/>;

// Or explicit, Flutter-backed widgets where the behaviour is widget-shaped:
<Hero tag="cover"><Image src={url} /></Hero>;          // shared-element, native, interruptible
<AnimatedSwitcher duration={200}><Show when={tab()}>…</Show></AnimatedSwitcher>;
```

Dart side is trivial — wrap `AnimatedFoo`, read the target from `node`, parse the curve with the **already-existing `parseCurve`** (`utils.dart:377`). When `animate` is present and the prop changes, Flutter's controller retargets *from the current interpolated value* natively (position continuity for free — no JS velocity bookkeeping).

### Recommended layering

| Layer | Surface | When | Bridge cost |
|---|---|---|---|
| **Base / default** | `animate={{duration,curve}}` on `<View>` + a few `<Animated*>`/`<Hero>` widgets | every single-target state transition (fade, resize, move, color, switch, hero) | **1 op per state change**, 0 per-frame |
| **Power tool** | `createSpring`/`createDerivedSpring`/`createTween` accessors | motion coupled to a live arbitrary signal; gesture-release fling | N ops/frame (acceptable, narrow) |
| **Special** | `<Presence>` enter/exit (needs protocol work, §6) | animating `<Show>`/`<For>` mount/unmount | core change |

**The accessor primitive is the *honest* primitive, but it is NOT the default.** The marketing/docs should lead with the implicit-animation story (cheap, native, covers 90% of UI motion), with `createSpring` as the documented power-tool for the cases Flutter can't reach. This inverts the research's instinct (which led with `createSpring`) and is the single most important framing correction.

---

## 4. JS-signal vs Flutter-native — the delegation matrix

The most important practical section. **Opinionated default: delegate unless the target is a live signal Flutter can't read.**

| Need | Drive from | Why |
|---|---|---|
| **Value tween** (single target, fixed) | **Flutter** `animate={{duration,curve}}` / implicit | Set target once; native interpolation; 0 per-frame ops. JS spring here is the expensive way to do the cheap thing. |
| **Opacity / color** (state transition) | **Flutter** `AnimatedOpacity` / `AnimatedContainer` color | `SliverAnimatedOpacity` already proves this. Also: Flutter's `ColorTween` interpolates in the correct space — **never reimplement color/gamma math in JS.** |
| **Layout / size** (content grows, panel expands) | **Flutter** `AnimatedSize` / `AnimatedContainer` | Layout-aware; the bridge can't beat native layout animation; Motion's FLIP is its *leakiest* feature (non-interruptible). |
| **Position** (reflow, snap-to) | **Flutter** `AnimatedAlign` / `AnimatedPositioned` | Same; interruptible from current frame natively. |
| **Scale / rotate / translate** (state transition) | **Flutter** `AnimatedScale`/`AnimatedRotation`/`AnimatedSlide` | Set target transform once; native. **Exception:** if scale is driven by a continuous JS signal → spring (below). |
| **Shared-element / hero** | **Flutter `Hero`** | Native geometry interpolation, interruptible. Both SwiftUI (`matchedGeometryEffect`) and Compose special-case this rather than spring raw frames. *Never reimplement FLIP.* |
| **Enter / exit (presence)** | **Flutter** `AnimatedSwitcher` + **a core deferred-removal protocol change** (§6) | The renderer emits `remove` synchronously (`renderer.ts:182`); an accessor cannot outlive its own removal. This is the genuinely hard one. |
| **List reorder** | **Flutter** `AnimatedList`/`SliverAnimatedList` | Collides with eager-sliver materialization otherwise; Flutter does layout-aware reorder natively. **Missing from the research; a real gap.** |
| **Scroll-linked** (parallax, collapsing header) | **Flutter, Dart-side** `SliverPersistentHeader` / `FlexibleSpaceBar` / `AnimatedBuilder(scrollController)` | `scrollOffset` is *already* a JS signal (`scroll-controller.ts`), making `createDerivedSpring(scrollOffset)` tempting — but it's a **full round-trip per scroll frame with +1 lag during the one interaction users scrutinize most.** Keep it Dart-side. **This is the biggest omission in the source research.** |
| **Gesture-follow** (1:1 finger pin) | **Dart-side**, direct | Pixel-pinned; must not round-trip through rAF (+1 frame). The whole point of the established rule. |
| **Gesture-release fling / settle** | **JS spring** seeded with handoff velocity | This is where the JS spring *earns its place*: Dart reports release velocity across the bridge; JS runs `springTo(rest, {velocity})` or a decay. Self-driving, so +1 frame is invisible. |
| **Continuous signal-coupled motion** (WebSocket value, physics, multi-signal math) | **JS spring** (`createSpring`/`createDerivedSpring`) | Flutter cannot read your JS signal. This is the *only* category that genuinely needs the JS spring. Batch multiple props of one widget into one object/op. |

**The honest dividing line:** *Flutter owns every single-target state transition and everything layout/geometry/presence-shaped. JS springs own only (1) motion continuously coupled to an arbitrary JS signal and (2) the gesture-release fling.* That is a much narrower JS footprint than the source research proposed ("JS owns transform/opacity/color") — and it's correct *because in this architecture every animated frame is a bridge op.*

---

## 5. Spring parameterization recommendation

**Recommendation: lead with `{duration, bounce}` + three named presets; expose `{stiffness, damping}` as an escape hatch. No `mass`.**

| Option | Verdict |
|---|---|
| **`{duration, bounce}`** (Apple/Motion modern) | **Primary.** Two independent, designer-legible axes. Universally praised as the intuitive one. `bounce 0` = no overshoot, `~0.3` = clearly bouncy. |
| **Presets `smooth`/`snappy`/`bouncy`** | **Ship these** (bounce ≈ 0 / 0.15 / 0.3, ~0.4–0.5s). The Svelte/Solid family's #1 complaint is *no presets* → copy-pasted magic numbers. Beat the prior art here. |
| **`{stiffness, damping}`** | **Escape hatch only.** Power users / parity with `SpringDescription`. Drop `mass` (Compose normalizes it away). |
| **Svelte/Solid normalized `0..1`** | **Reject.** Opaque, framerate-coupled. `@solid-primitives/spring` inherits exactly this — do not adopt as-is. |

Two non-negotiable correctness constraints the research under-weights, both grounded in the actual rAF (`raf_driver.dart`):

1. **Integrate analytically against the monotonic timestamp, not per-frame `dt`.** A spring is a stateful integrator; the rAF doc tells users to "compute state as a function of the timestamp … so it stays correct even if a frame is dropped." A naive per-frame-`dt` spring *diverges* on dropped frames. Use Apple's `Spring.value(target, v0, t)` analytic form — sample at the frame timestamp. Also fixes Svelte's historical framerate-dependence bug for free.
2. **Material-3's spatial-vs-effects split, as preset policy:** position/size/scale presets *may* overshoot; **opacity/color presets must be clamped (no bounce)** — a spring overshooting opacity past 1.0 is a bug. Bake this into the presets, not the call site.

*(Note: the research's cited Reanimated defaults "mass 4 / stiffness 900 / damping 120" are wrong — Reanimated's actual `withSpring` defaults are mass 1 / stiffness 100 / damping 10. Don't copy the fabricated numbers.)*

---

## 6. Cross-cutting must-haves

**Interruption / retargeting with velocity preservation.** *The* quality differentiator (SwiftUI, Compose, Reanimated all make it automatic; GSAP's lack of it is the cautionary tale). For the **JS spring**: keep `value` + `velocity` as live mutable state; on `set(newTarget)`, re-aim from current value *and* current velocity — never the captured start. Trivial when velocity lives in JS. For **delegated Flutter animations**: you get *position* continuity free (the controller restarts from the current interpolated value) — don't reimplement it. *Caveat unique to us:* the on-screen value lags the JS signal by ~1 frame, so any predict-then-branch fling logic (Compose `calculateTargetValue`) runs on a value ~1 frame stale vs pixels. Acceptable, but document it.

**Completion.** `set()` returns a `Promise` that resolves on settle (Svelte/Compose pattern). Sequencing and stagger fall out of `await` with no orchestration engine. Implicit-animation widgets already expose `onEnd` (see `SliverAnimatedOpacity`).

**Orchestration — minimal set.** Resist a GSAP timeline. Ship: `delay` (spec option), `stagger(each, {from})` as a *pure helper returning a per-index delay* (not a component), `repeat`/`yoyo` (spec options), and `await`-sequencing via the settle Promise. **Caveat:** stagger-of-N-JS-springs in a `<For>` is N per-frame op streams — prefer staggered *implicit* animations (per-item `delay` on `AnimatedOpacity`), which is N triggers and **zero** per-frame JS traffic.

**Enter/exit (presence) — the hard one.** Verified: `renderer.ts:182` `removeNode` emits `remove` synchronously; `<Show when={false}>` destroys the widget immediately. **An accessor cannot express presence — the node must outlive its own removal.** This needs a **core protocol change**, exactly like the sliver suite needed protocol enhancements — not just a new API. Two routes:

- **Delegate to Flutter `AnimatedSwitcher`** (keeps the *outgoing* child mounted Dart-side and animates it out). But JS has already sent `remove` — so **Dart must buffer the removed `FuseNode` subtree** until the exit completes. Requires a *deferred/animated removal op* in the protocol.
- **JS-side keep-alive `<Presence>`** that delays the `dispose`/`remove` op until an exit signal settles — but this fights Solid's owner/`onCleanup` disposal and needs renderer support for deferred removal anyway.

Recommendation: **delegate to `AnimatedSwitcher`/`AnimatedSize` with a new "remove-after-exit" op**; expose a small `<Presence>` element as the *one* sanctioned wrapper (presence is the single thing an accessor structurally can't do — Compose/Reanimated/Motion all special-case it too). **Flag this as the highest-effort, least-resolved item.**

**Reduced motion / accessibility.** Expose a host-provided reactive accessor backed by Flutter `MediaQuery.disableAnimations` / `accessibleNavigation`. Default policy = **respect the OS setting** (avoid Motion's `'never'` footgun). When set: implicit animations pass `duration: 0`; springs `set(target, {instant:true})`. Copy SwiftUI/Motion's *policy* not just the boolean — **kill transform/position motion, keep opacity crossfades** (vestibular-safe). One branch on a decoupled spec, global.

---

## 7. Anti-patterns for our bridge

- **Per-frame `setProp` streams that aren't batched.** Animating `{x, y, scale}` as three springs = 3 ops/frame for one widget. **Batch into one object prop → one op.** Make "animate an object" the documented norm, framed explicitly as a *bridge-traffic* optimization (the research mentions it but never as a cost fix).
- **JS-springing a single fixed target.** A plain fade/resize as a JS spring is strictly worse than `AnimatedOpacity`/`AnimatedSize`. Reach for implicit animation first.
- **Routing input handlers through rAF.** Adds +1 frame to 1:1 finger tracking. Set the signal directly from the handler; pixel-pin stays Dart-side.
- **`createDerivedSpring(scrollOffset)` for scroll effects.** Full round-trip per scroll frame + lag, during peak-scrutiny scrolling. Use `SliverPersistentHeader`/Dart-side `AnimatedBuilder`.
- **Reimplementing what Flutter does better:** color/gamma interpolation, 4×4 matrix lerp, FLIP layout, hero transitions, list reorder. Flutter has `Tween<T>` for every type — delegate.
- **A spring that forgets to `cancelAnimationFrame` on settle.** Pins the idle-gated vsync loop awake forever → battery regression *unique to this driver*. **Rest-detection must call `cancelAnimationFrame`** (precision/restDelta threshold). The research never connects settle-detection to idle-gating; for us it's mandatory.
- **A `<motion.div>` value-magic wrapper as the core.** Hides the reactive value; clashes with the no-magic preference. The accessor already exposes everything it would.
- **Imperative Tween/Timeline as a parallel source of truth** (GSAP/Motion `animate()`). Fights the signal graph; leaks without manual teardown.

---

## 8. Recommended build order

Tied to the just-shipped rAF foundation (`raf_driver.dart`) and the `AnimationController` coverage gap.

| Phase | Ship | Proves / unlocks | Effort |
|---|---|---|---|
| **0 (done)** | vsync rAF, monotonic ts, idle-gating, `parseCurve`, `SliverAnimatedOpacity` | the substrate + a working delegation instance | — |
| **1 — Implicit-animation layer (the default)** | `animate={{duration,curve}}` on `<View>` (delegates to `AnimatedContainer`/`AnimatedOpacity`/`AnimatedAlign`); wrap `AnimatedSize`, `AnimatedSwitcher`, `Hero`. Reduced-motion accessor → `duration:0`. | covers ~90% of UI motion at **0 per-frame bridge cost**; the headline ergonomic | **low** — reuse `parseCurve`, mirror `SliverAnimatedOpacity` |
| **2 — `createSpring` accessor (the power tool)** | `createSpring`/`createDerivedSpring`/`createTween` over the rAF clock: analytic integrator, `{duration,bounce}`+presets, settle→`cancelAnimationFrame`, live `velocity()`, Promise on settle | continuous signal-coupled motion; fills the `AnimationController` gap on the JS side | **medium** — core math + correct idle interaction |
| **3 — Gesture-release fling** | bridge carries release velocity (Dart→JS); `springTo(rest,{velocity})` + a `decay` primitive | native-feeling throw/snap; the high-value Dart→JS seam | **medium** — needs velocity in the bridge payload |
| **4 — Presence (the hard one)** | core protocol: deferred/"remove-after-exit" op; `<Presence>` element backed by `AnimatedSwitcher`; Dart buffers removed subtree | animating `<Show>`/`<For>` mount/unmount | **high** — renderer + bridge protocol change |
| **5 — Orchestration sugar** | `stagger()` pure helper, `repeat`/`yoyo`/`delay` spec options, `await`-sequencing; `AnimatedList`/`SliverAnimatedList` for reorder | choreography without a timeline engine | **low–medium** |

**Phase 1 before Phase 2 is the key sequencing call:** it proves the *cheap* default first and prevents users (and us) from reaching for the expensive JS spring out of habit.

---

## 9. Open questions for the author

1. **Where exactly does the JS spring earn its keep?** I've drawn the line at *"only signal-coupled-continuous motion + gesture fling; everything single-target delegates to Flutter."* Is that narrow enough, or do you want `createSpring` available for ergonomic single-target use too (accepting the per-frame op cost as a deliberate trade)? This decides whether the headline primitive is `animate={…}` or `createSpring`.

2. **Implicit-animation surface: a prop on `<View>`, or distinct widgets?** Option A: one `animate={{duration,curve}}` prop that makes *any* `<View>` prop change implicitly animated (one mental model, but which props animate? all of them?). Option B: explicit `<AnimatedView>` / `<Animated.opacity>` widgets (clearer, more surface). Which trades better against your small-surface preference?

3. **Presence is a core protocol change — is it in scope now or later?** Deferred removal touches the renderer *and* the bridge (like the sliver suite did). Do we design the "remove-after-exit" op now, or ship Phases 1–3 and treat presence as a follow-up suite?

4. **Predicted-display-timestamp:** should `createSpring` sample at the *predicted next-frame* time (to hide the +1 frame bridge latency for self-driving motion), and if so do we add a predicted-ts field to `_rafTick`'s payload now, or sample at the raw `currentFrameTimeStamp` and revisit?

5. **Spring config shape:** confirm `{duration, bounce}` + `smooth`/`snappy`/`bouncy` presets as the default, `{stiffness, damping}` (no mass) as the escape hatch — and do you want the spatial-vs-effects clamp (opacity/color presets can't overshoot) baked into the presets?

**Relevant files:** `packages/solid-fuse/src/renderer.ts` (the `setProp`/synchronous-`remove` constraint), `packages/solid-fuse/dart/lib/src/raf_driver.dart` + `packages/solid-fuse/src/polyfills.ts` (the rAF foundation, no predicted-ts yet), `packages/solid-fuse/dart/lib/src/widgets/slivers/sliver_animated_opacity.dart` (the working delegation pattern to mirror), `packages/solid-fuse/dart/lib/src/widgets/view.dart` (plain `Opacity`/`Transform` — the un-animated baseline), `packages/solid-fuse/dart/lib/src/utils.dart:377` (`parseCurve`, the delegation seam), `packages/solid-fuse/src/scroll-controller.ts` (the already-a-signal `scrollOffset` that makes scroll-linking tempting-but-janky), `packages/docs/content/docs/building/animation-frames.mdx` (the doc to extend).