# What the Flutter Ecosystem Wants — and the Timeline Question

*An addendum to the solid-fuse animation design. The primitives in §3 of `notes/animation-primitives-research.md` are decided; this extends them. It answers four open questions against real pub.dev demand and reconciles a research blob that leans toward "JS-springs by default" — a framing the prior note already refuted (in this architecture **the render cycle is the bridge**, so a per-frame JS spring is N bridge crossings vs one `setProp` for the native equivalent). Throughout, I use the ecosystem to validate **API shape**, never **placement**.*

---

## The one framing guardrail (read first)

Motor's builders look exactly like our signal-read-rebuilds-this-widget model — but Motor rebuilds **in-process Dart (free)**; ours rebuilds **across fjs (one batched op + 1 frame latency)**. So:

> Use the ecosystem to validate the **shape** of our primitives (accessor-out, velocity-preserving retarget, `{duration,bounce}`, presets, named entrances). Do **not** let its "move the animation layer into JS" instinct override the note's delegation-first default. Every addition below is judged twice: *is the shape right?* **and** *whose side of the bridge does it run on?*

This is why several "gaps" the research ranks highly (vector spring, scroll adapters) get demoted or constrained here.

---

## 1. The timeline question — answered

**What a bound timeline (MovieTween, GSAP) gives that "N signal-springs + `delay` + settle-`Promise` + `await`" does not — exactly three things:**

| Capability | A bound timeline does it by… | Do N independent signals already have it? |
|---|---|---|
| **Coordinated multi-property choreography** | All tracks read one composed value object at time *t* | **Yes.** Reading several accessors in one JSX node already coordinates them; that's the whole model. |
| **Relative-to-previous timing** ("stage N starts X after N-1 *ends*") | `thenFor` / `.then()` re-baseline the clock | **Partially.** `await a.settle; startB()` covers it, but is verbose for 4–5 stages and can't express *negative* overlap cleanly. **← the one real ergonomic gap** |
| **Single scrubbable/reversible/seekable source of truth** | One controller's `value` drives every track; set it to seek | **No** — but reproducible with **zero new primitive**: one master `progress` signal, many spring/tween readers, each mapping shared *t* into its own window via accessor-as-`to`. |

**Why a master clock is the *wrong* shape for us.** A bound timeline's headline power — global reverse/seek of a unit — collides with our actual moat: **interruptible, velocity-preserving retarget**. In a signal world, "reverse" is re-targeting and "loop" is a driving signal; each spring is independently retargetable. A master clock would *fight* that. The market agrees: **Heroine (30.6k wk dl), the best modern transition package, threw the timeline out entirely** and runs off one settling spring with concurrent `.chain()` composition. Five clusters converge — flutter_animate's `.then()`, animate_do's chaining, staggered's `delay*position`, Motor's `MotionSequence`, animated_text_kit's ordered list — **all sequencing in the wild is cumulative-delay arithmetic or await-on-completion**, both of which `delay` + settle + `await` already subsume.

### Verdict: no timeline primitive. Ship one small `sequence()` helper + document one scrub recipe.

A mechanism-visible helper that lowers to the `delay` option we already have — **not** a hidden controller:

```ts
// sequence(): pure delay arithmetic over the steps. Returns nothing magic —
// each step's `at` is a computed absolute delay you could have written by hand.
// "+=" = after previous step ENDS (relative); negative = overlap (start early).
sequence([
  { run: () => fadeTo(1),    dur: 300 },              // t=0
  { run: () => slideTo(0),   at: "+=0",  dur: 400 },  // t=300 (after prev ends)
  { run: () => blurTo(0),    at: "-=150" },           // t=350 (overlap prev by 150)
]);
// Lowers to: schedule each run() at its resolved absolute delay. No clock, no seek,
// no parallel source of truth. Branching/data-dependent timing → still use await-settle.
```

The **scrub** case (scroll- or gesture-pinned intro) needs **no code at all** — document it as a pattern:

```tsx
// "One progress signal, many readers" = MovieTween scrub, signal-native.
const progress = createSignal(0);                       // 0..1, drive from scroll/gesture/spring
const opacity = () => clamp01(remap(progress(), 0,   0.4));   // window [0, 0.4]
const y       = () => lerp(24, 0, remap(progress(), 0.2, 0.8)); // overlapping window
<View opacity={opacity()} transform={{ translateY: y() }} />;
```

This is the honest answer to OQ1: **the signal graph already *is* a timeline**; we owe users the relative-timing sugar and the scrub recipe, nothing structural.

---

## 2. Motor, head-to-head

Motor (226 likes, 63.3k wk dl, the closest existing analog) unifies springs and curves under one polymorphic `Motion` value you swap at a single call site. **Does it argue we should collapse `createSpring`/`createTween` into one `createMotion(value, motion)`?**

| | Motor (unified `Motion`) | solid-fuse (split `createSpring`/`createTween`) |
|---|---|---|
| Swap spring↔curve at call site | One arg change | Two factory names |
| **Which integrator runs is visible** | **Hidden** behind the `Motion` value | **Visible** in the factory name |
| Matches author's no-magic preference | No — opaque value | **Yes** |
| Velocity-preserving retarget | Yes (spring path) | Yes (the moat) |

### Recommendation: keep the split. Two named primitives.

Motor proves a unified umbrella is **viable, not necessary** — and a single opaque `Motion` value hides *which integrator runs*, the exact thing the author rejects. A `createTween` and a `createSpring` are not interchangeable in their *guarantees* (one settles analytically and carries velocity; one runs a fixed curve to a fixed end), and the name should say which you get. The "swap at one call site" win Motor sells is real but tiny, and you can offer it without an opaque type if you ever want it: a thin `createMotion(value, motionConfig)` that dispatches on a **discriminated, inspectable** config (`{kind:"spring", ...}` vs `{kind:"tween", ...}`) — mechanism stays in the config, not behind a brand. **Don't build that now**; the split already covers it.

**Worth stealing from Motor's API (shape only):**

| Steal | Why | Cost |
|---|---|---|
| **Velocity-preserving auto-retarget on `to`-accessor change** | Already decided — Motor independently converging confirms it's right | — (have it) |
| **`{duration, bounce}` + named presets**, stiffness/damping escape hatch | Identical to our decided leaning — strong independent convergence | — (have it) |
| **An `interactive` preset** (low-response, gesture-driven) | Motor ships `CupertinoMotion.interactive`; it's the vocabulary for fling/drag-settle; we have smooth/snappy/bouncy only | trivial: one preset constant |
| **`NoMotion` / instant** as a first-class motion | Maps to our `{instant:true}` / reduced-motion path; useful as an explicit "no animation" value in conditional config | trivial |

**Do not steal:** the `MotionSequence` object (our `sequence()` + await covers states/steps; `.spanning` is the scrub recipe), the `MotionConverter`/vector type (see §3 — bridge-constrained), or the unified `Motion` type itself.

---

## 3. Real gaps — what to ADD to the primitive set

Opinionated, small-surface. Each judged on demand **and** bridge placement.

| Candidate | Demand signal | Verdict | Shape / constraint |
|---|---|---|---|
| **repeat / loop / yoyo (mirror)** | Universal: Motor `LoopMode.seamless/pingPong`, simple_animations `Mirror`, animate_do `infinite`; flutter_animate punts to raw controller (a known rough edge) | **FIRST-CLASS OPTION on `createTween`/`createSpring`.** Highest-priority add. | `{ repeat: n | Infinity, yoyo: true }`. **Hard constraint:** an infinite loop is the *one legitimate never-settles case* — it must keep a live `cancelAnimationFrame`-on-`stop()` handle, or it pins the idle-gated vsync loop awake = battery regression. Looping defeats settle-gating *by design*; gate on an explicit `stop()`/disposal instead. |
| **Named entrance presets** (`fadeInUp`, `scaleIn`, `pulse`, `shake`…) | **Loudest cross-validated demand:** animate_do (4.91k likes), flutter_animate (~40 effects, 925k dl), animated_text_kit (Flutter Favorite). Devs reach for a *named feeling*, not spring config. | **SHIP — but as transparent factories, ideally a `@solid-fuse/motion` add-on** (mirrors the shipped `@solid-fuse/lucide` pattern). **Not core, not magic widgets.** | Each returns the **same accessors a user could wire by hand** (`fadeInUp()` → `{ opacity, translateY }` accessors over `createSpring`/`createTween`), read in JSX. Must NOT regress into value-magic wrapper widgets that hide the accessor. The `from`/overshoot knob maps to spring `bounce`. **This is the single biggest ergonomic gap.** |
| **keyframes / multi-stop `to`** | Weak as a standalone; `.spanning` exists in Motor but is niche | **SKIP as a primitive.** Covered by the §1 scrub recipe (one progress signal, windowed readers) or by `sequence()` for sequential stops. | — |
| **value/notifier adapters** | flutter_animate `ValueAdapter`/`ChangeNotifierAdapter` | **ALREADY FREE — build nothing.** "Drive animation from a value" *is* `createSpring(to: someAccessor)`. Our follow-a-signal mode *is* the Adapter. | Document the equivalence; ship no `Adapter` class. |
| **scroll adapter** | flutter_animate `ScrollAdapter` | **DO NOT build JS-side. Delegate to Dart.** | A `createDerivedSpring(scrollOffset)` is a full bridge round-trip **per scroll frame + 1-frame lag during the one interaction users scrutinize most**. Keep scroll-linked motion Dart-side (`SliverPersistentHeader`). The research drops this caveat; it stands. |
| **reverse / seek** | Implied by every timeline | **NO primitive.** Reverse = re-target to the start value (velocity-preserving, free). Seek = the master-`progress`-signal recipe (§1). | — |
| **decay / fling** | Reanimated `withDecay`, Motor interactive | **FIRST-CLASS — already in the build plan (Phase 3).** This is where the JS spring genuinely earns its keep: Dart reports release velocity across the bridge, JS runs `springTo(rest,{velocity})` or `decay`. Self-driving, so +1 frame is invisible. | Keep as planned. |
| **vector / multi-dimensional spring** (Motor's headline) | Motor/springster differentiator: per-axis independent velocity on Offset/Size/Rect/Color | **LOW PRIORITY, and only if batched.** Two scalar springs already cover `{x,y}` today losing little. | If built, **all components must batch into ONE object `setProp` per frame** — a naive one-op-per-axis vector spring is exactly the per-frame-stream anti-pattern from §7 of the note. Nice-to-have (one settle, per-component velocity), not load-bearing. |
| **enter/exit presence** | animate_do `animate:true/false` (forward=enter, reverse=exit) + `onFinish(direction)` shows devs expect **one declaration to drive both, with mount/unmount as the trigger** | **CORE PROTOCOL GAP — already the note's hardest item.** The ecosystem reinforces the *shape*: a `<Presence>` wrapper + deferred-removal op, not an accessor. | Highest effort; unchanged from the note's Phase 4. |
| **first-frame / viewport gate** for list entrances | flutter_staggered_animations' `AnimationLimiter` (124k dl): "animate only items on screen in the first frame; render later/scrolled-in items instantly" | **GENUINE CAPABILITY GAP — needs a Flutter-side first-paint flag.** | A pure mount-fires-signal model *cannot* express this: in a lazy/sliver list, children mount as they scroll in (and we materialize slivers eagerly — interacts here). Same delegation bucket as Hero/measure. |
| **2D / grid stagger** | staggered's `staggeredGrid` derives delay from row **and** column via `columnCount` | **EXTEND the existing `stagger(each,{from})` helper.** Small. | Let the index→delay fn take `(index, columnCount)`; pure math, no new primitive. |

---

## 4. Transitions & hero — delegate to which?

The note delegates hero to Flutter. The research sharpens *which* Flutter:

| Option | Feel | Verdict |
|---|---|---|
| **Stock `Hero`** | Fixed-duration, **non-interruptible** | **Reject as the hero backing.** Clashes head-on with our spring-everywhere identity. |
| **Heroine** (30.6k wk dl, built on Motor) | **Spring-driven, interruptible, drag-to-dismiss with carried velocity** | **DELEGATE TO HEROINE.** |
| Villains (88 dl, dormant) | Observer-driven per-widget enter/exit | **Skip.** Market-dead; its job is covered by our entrance presets (§3) + presence (§3). |

### Recommendation: delegate hero to **Heroine**, not stock `Hero`.

Heroine's contract — spring flight, interruptible/re-targetable mid-flight, drag-dismiss with velocity — **is exactly `createSpring`'s contract**, expressed on the side that actually has the cross-route geometry JS lacks. And its config maps 1:1: our `{duration,bounce}` / smooth-snappy-bouncy presets feed straight into `Motion.spring(...)` / `CupertinoMotion`. Concretely:

- Expose a `<Hero tag=…>` element whose Dart side mounts `Heroine` + registers `HeroineController` as a navigator observer.
- Its `motion:` comes from the **same spring config object** users pass to `createSpring` — one vocabulary for in-page springs and cross-route flight.
- Add a JS escape hatch to **feed gesture velocity across the bridge** (mirrors `HeroineVelocity`); our gesture-pin already produces direct signal velocity Dart-side.

**Route transitions** (the official `animations` package, **1M dl** — container transform / shared axis / fade-through / fade) are a **route-LAYER** concern, not a signal primitive. Surface a `transition:` option on the **navigation API** that delegates to the official widgets. Container transform specifically needs measure-to-content + route geometry — same delegation bucket as `AnimatedSize`/FLIP.

**No transition timeline needed:** Heroine itself proves concurrent `.chain()` composition off one settling spring suffices; in our world `.chain()` is just "read multiple accessors in one JSX node."

---

## 5. The delegate / userland / interop line

The popularity gradient *is* the build line. Make explicit what we do **not** build.

| Category | Demand | Classification | What we ship |
|---|---|---|---|
| **Loaders / spinners** (flutter_spinkit, 423k dl) | Huge; "give me a named spinner now" | **Userland recipe on our primitives** | A looping `createTween`/`createSpring` on rotation/scale = ~10-line example. Candidate for the `@solid-fuse/motion` add-on. **No API.** |
| **Text effects** (animated_text_kit, Flutter Favorite, 124k dl) | High; typewriter/reveal | **Userland recipe** | Typewriter = `createTween` over substring length, read in JSX. Recipe. **No API.** |
| **Generative / canvas / SVG-stroke** (funvas, drawing_animation) | Niche but real escape hatch | **Delegate to CustomPaint, fed by our rAF clock** | Expose `<Canvas paint={(ctx, t) => …}>` — our shipped monotonic rAF timestamp **is** funvas's `t`. We give the surface + clock; the user writes the draw. |
| **Lottie** (1.62M dl — the single biggest "animation" demand in Flutter) | Massive | **Interop with a separate runtime** | Wrap the Dart `lottie` package as a `<Lottie src=…>` element; the **only** signal-driven part is binding an accessor to controller `progress` (signal/scroll scrubs the file). JS lacks the INPUT (the authored asset) — pure delegate-and-bind. |
| **Rive** (382k dl) | Large | **Interop with a separate runtime** | Wrap Dart `rive`; bind signals to **state-machine inputs/triggers**. |

**We do NOT build:** a tween/spring engine that reimplements any of the above; an `Effect` class hierarchy; a shader/GLSL layer; a MovieTween scene graph; Lottie/Rive players. The dividing line is the note's, unchanged: **signal-driven is the default mechanism, Flutter builds the actual widgets, delegate only where JS lacks the INPUT** (cross-route geometry, measure-to-content, raw canvas, foreign asset formats).

---

## 6. Updated primitive set + build order

Reconciled with the note's delegation-first default. **Bold = new from this research.** Phase numbering continues the note's §8.

### Final animation surface

| Surface | Status | Placement |
|---|---|---|
| `animate={{duration,curve}}` on `<View>` + `<Animated*>` | decided (Phase 1) | **Flutter** — the cheap default for single-target transitions |
| `createSpring` / `createDerivedSpring` / `createTween` | decided (Phase 2) | JS — power tool, signal-coupled motion only |
| `to` as value or accessor (velocity-preserving retarget) | decided | JS |
| `delay` option · `stagger(each,{from})` helper · settle `Promise` | decided | JS |
| `{duration,bounce}` + smooth/snappy/bouncy presets · `{stiffness,damping}` escape hatch | decided | JS |
| Gesture-release fling / `decay` (velocity over bridge) | decided (Phase 3) | JS (self-driving) |
| `<Presence>` + deferred-removal protocol op | decided (Phase 4) | **Core protocol** |
| **`repeat` / `yoyo` options** (+ explicit `stop()` for infinite) | **NEW** | JS option |
| **`interactive` preset · `NoMotion`/instant value** | **NEW** | JS |
| **`sequence([...])` relative-timing helper** (`+=`/`-=` overlap) | **NEW** | JS (lowers to `delay`) |
| **"one progress signal, many readers" scrub** | **NEW (doc recipe)** | JS |
| **2D/grid `stagger` extension** (`columnCount`) | **NEW** | JS helper |
| **Named entrance presets** (`fadeInUp`, `scaleIn`, `pulse`, `shake`…) | **NEW** | **Add-on** `@solid-fuse/motion` (transparent factories) |
| **First-frame/viewport gate** for list entrances | **NEW** | **Flutter-side flag** (capability gap) |
| **Hero → Heroine** (interruptible spring, drag-dismiss, velocity in) | **NEW (sharpens decided)** | **Delegate to Heroine** |
| **Route `transition:` option** (shared-axis/fade-through/container-transform/fade) | **NEW** | **Delegate to official `animations`** (navigation API) |
| **`<Canvas paint={(ctx,t)=>…}>`** | **NEW** | **Delegate to CustomPaint** + rAF clock |
| **`<Lottie>` / `<Rive>` interop** (bind accessor → progress/input) | **NEW** | **Interop** (wrap Dart packages) |

### Build order (continues the note's §8)

| Phase | Ship | Effort | Note |
|---|---|---|---|
| **1–4** | (unchanged from the note) | — | implicit-animation default → `createSpring` → fling → presence |
| **5 — Orchestration + loop** | `sequence()` helper, **`repeat`/`yoyo` options + explicit `stop()`**, 2D `stagger`, scrub recipe in docs | low–med | loop's `stop()`/idle-gating interaction is the one correctness watch-item |
| **6 — Hero/route delegation** | `<Hero>` → Heroine + velocity-over-bridge; route `transition:` → `animations` | medium | both are delegate-and-bind; reuse the spring config vocabulary |
| **7 — Interop + canvas** | `<Lottie>`, `<Rive>`, `<Canvas paint={(ctx,t)}>` | medium | pure wrap + accessor→progress binding |
| **8 — `@solid-fuse/motion` add-on** | named entrance presets as transparent factories | low | ships last; proves the primitives by building the vocabulary *on* them. Mirrors `@solid-fuse/lucide`. |

Rationale for ordering: loop/sequence (5) are pure sugar over shipped primitives; delegation (6–7) is independent and parallelizable; the preset add-on (8) ships last **because it must be built *on* the finished primitives** — that's the proof they're complete, and keeps the named vocabulary out of the core surface.

---

## 7. Open questions for the author

1. **`repeat`/`yoyo` stop semantics.** An infinite loop is the one legitimate never-settles case and **defeats idle-gating by design**. Confirm: gate the loop on an explicit returned `stop()` handle (and Solid `onCleanup` disposal), accepting that a live loop holds the vsync ticker awake — *and* that we lint/warn if a loop has no reachable stop? This is the single battery-correctness call.

2. **Entrance presets: add-on or core?** I recommend a `@solid-fuse/motion` add-on of transparent factories (`fadeInUp()` → accessors). Do you want even that out of the main package, or is an in-tree `recipes/` module (zero new published surface) the better small-surface trade?

3. **Hero = Heroine: a dependency on a pre-1.0 package (v0.7.2).** Heroine is the right *feel* and the highest-download modern hero package, but it's pre-1.0 and single-author. Acceptable as the hero backing, or do we ship a stock-`Hero` fallback path and gate Heroine behind a flag until it hits 1.0?

4. **`sequence()` vs. await-settle — is the sugar even worth it?** await-settle already chains; `sequence()` only buys terser cumulative-delay + negative-overlap for fixed storyboards. Worth the (small) surface, or document the await-settle pattern and skip the helper entirely?

5. **Vector spring — build or document "use two springs"?** Two scalar springs cover `{x,y}` today. Build a batched vector spring (one object op/frame, per-component velocity, one settle), or just document the two-spring pattern + the batching anti-pattern? I lean *document now, build only on demand*.

6. **Canvas `t`: raw vs predicted timestamp.** `<Canvas paint={(ctx,t)}>` reuses the rAF clock. Same predicted-vs-raw-timestamp question as OQ4 in the note — resolve both together?

**Net:** the ecosystem validates the decided **shape** wholesale (accessor-out, velocity-retarget, `{duration,bounce}`+presets, split factories) and adds **no master clock**. It contributes one option (`repeat`/`yoyo`), one helper (`sequence()`), one stagger extension, one add-on (entrance presets), two delegations sharpened (Hero→Heroine, route transitions), and three interop surfaces (Canvas, Lottie, Rive) — every one of them on the correct side of the bridge.