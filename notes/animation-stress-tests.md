# Animation stress-test suite

The catalog of "what people use animation for," to pressure-test the animation API
(see `animation-primitives-spec.md`). Built by surveying 12 sources (Framer Motion,
GSAP, React Spring, Reanimated, SwiftUI, Compose, CSS/web platform, Lottie & Rive,
Flutter + pub packages, Anime.js/Motion One/Theatre.js, motion-design theory, and
real-world app UI patterns) → **577 raw use cases** deduped into the catalog below,
then an adversarial completeness pass for what the survey missed.

**Scope tally:** ~94 `[v1]` · ~129 `[deferred]` · ~43 `[needs-decision]`.

**The survey validated the scoping.** The `[deferred]` clusters — presence/exit,
gesture helpers, scroll-linked, repeat/loop, curves/tween, named presets,
shared-element/Hero — match the spec's deferral list *exactly*. Strong signal the v1
boundary is drawn in the right place.

## Decisions this forces on the spec

**Already handled (validated by the survey):**
- Large-`dt` / backgrounding recovery → `dt`-clamp (spec §4). *(The critic's #1 spring-explosion bug — we already have the fix.)*
- 60↔120 Hz correctness → time-based velocity (§4).
- Interrupt / retarget carrying velocity → core spring.
- Instant / disable → `set(x, {instant})`.

**New decisions to fold in** (prioritized — what the pressure-test should drive out):
1. **Velocity readout** — expose a driver's current velocity. Cheap; unlocks gesture hand-off, velocity-tracking, derived motion. → likely v1.
2. **Settle-promise semantics under retarget *and* unmount** — exact behavior (resolve `"interrupted"`; abort cleanly on a dead signal). The #1 API footgun. → v1.
3. **Decay / fling** — a distinct simulation from spring; the partner to `set(x,{velocity})`. Fits the model as a built-in *decay `propagate`* (`createMotion` + decay). → v1-easy.
4. **Clamp / bound on a spring** — progress bars must not exceed 100%; anchored snaps. Small option. → v1?
5. **Angle / hue shortest-path + perceptual/log interpolation** — `lerpAngle` (359°→1° = +2°), log-scale lerp; linear is visibly wrong for rotation/headings/zoom/dB. → cheap typed-interp additions.
6. **Auto / content-size target** — accordion/collapse animate to a *measured* size `{from}` can't express. Needs renderer measurement. → layout-deferred.
7. **Path interpolation** (shape morph + motion-along-path) — a typed-interp plug-in beyond `lerp/lerpColor/lerpVec`. → deferred plug-in.
8. **Reduced-motion** — *substitution* (slide→fade), not a binary off-switch, + a WCAG-required pause affordance for any indefinite loop. → accessibility decision.
9. **RTL / direction-aware motion** — directional slides, back-nav, stepper, stagger order all flip under RTL. Zero coverage today. → convention/helper decision.

---

# Entrances & Exits

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Mount entrance** | Animate an element from an initial state into view the moment it appears (fade/slide/scale/zoom/bounce/flip/roll in). | typed-interpolation, frame-exact-timing | **[v1]** — entrance via `{from, delay}` |
| **Pre-animating on first composition** | Element is already mid-entrance the instant it first enters the tree (no post-mount flash). | frame-exact-timing, presence/exit | **[v1]** — `{from}` resolves before first paint |
| **Exit / unmount animation** | Keep an element alive long enough to animate it out before it's removed from the tree. | presence/exit | **[deferred]** — presence/exit layer |
| **Asymmetric appear/disappear** | Different motion for insertion than for removal of the same view. | presence/exit, multi-property coordination | **[deferred]** |
| **Combined/layered entrance** | Stack slide + expand + fade + scale + flip into one composite entrance/exit. | multi-property coordination | **[v1]** — one driver, derive many |
| **Directional slide from edge** | Content enters/leaves sliding from a chosen edge, optionally sized to its container. | typed-interpolation | **[v1]** |
| **Expand/collapse reveal** | Grow open from a point or axis and shrink back (chip, accordion, disclosure). | typed-interpolation | **[needs-decision]** — auto/content-size target (see Layout) |
| **Scale/pop entrance** | Zoom an element up into view and back out (dialog, FAB). | typed-interpolation | **[v1]** |
| **Blur-replace transition** | Cross-dissolve one view into another through a blur as content swaps. | typed-interpolation, presence/exit | **[needs-decision]** — typed blur + swap |
| **Empty-state / success illustration** | One-shot celebratory or explanatory illustration on a terminal state. | frame-exact-timing | **[v1]** (if not designer-authored asset) |
| **Loading → success morph** | Button depresses → spinner → success checkmark across an in-flight request. | timeline/sequencing, presence/exit | **[deferred]** — sequence + presence |

# State Transitions

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Single-value state change** | Smoothly animate any numeric/style value from old to new whenever bound state flips. | interruption/velocity-carry | **[v1]** — `createMotion` / `createSpring` from a signal |
| **Implicit scoped animation** | Animate automatically when a specific bound value changes, scoped to that driver. | interruption/velocity-carry | **[v1]** — `createMotion(()=>signal)` |
| **Named visual states** | Animate between named states (open/closed, active/inactive, on/off). | multi-property coordination | **[v1]** — derive props from a state signal |
| **Variants propagating to subtree** | Named states animate a whole subtree, cascading through children. | multi-property coordination | **[needs-decision]** — context propagation pattern |
| **Toggle between two visuals** | Animate a widget between an on/off appearance from a boolean flag. | multi-property coordination | **[v1]** |
| **In-place content swap** | Cross-fade/interpolate a view's content when it changes without insert/remove. | presence/exit, typed-interpolation | **[deferred]** — needs presence |
| **Crossfade between layouts** | Fade one screen/state out while the next fades in, no slide/size change. | presence/exit | **[deferred]** |
| **Switch the visible child** | Animate replacement of one keyed child by another with custom in/out. | presence/exit | **[deferred]** |
| **Direction-aware content swap** | Slide new content in from the side matching increase vs decrease (stepper/counter). | presence/exit, multi-property coordination | **[deferred]** |
| **Morph container size between contents** | Animate the bounding box as it resizes from outgoing to incoming content size. | layout/shared-element, presence/exit | **[deferred]** |
| **Animated theme transition** | Morph the whole theme (light/dark, accent) across the UI. | typed-interpolation, multi-property coordination | **[v1]** — `lerpColor` from theme signal |
| **Transaction-controlled override** | Override or disable the inherited animation for one specific update. | frame-exact-timing | **[needs-decision]** — `set(x,{instant})` covers disable |

# Continuous & Looping

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Continuous loop** | Repeat indefinitely — spinner, pulsing dot, breathing glow, ambient idle. | looping/never-settles | **[deferred]** — repeat/loop layer; `createElapsed` can drive |
| **Ping-pong / mirror** | Oscillate forward then backward each cycle (heartbeat, sway, wobble). | looping/never-settles | **[deferred]** |
| **Fixed-count repeat** | Play N times, optionally reversing each cycle (shake twice then stop). | looping/never-settles, frame-exact-timing | **[deferred]** |
| **Conditional / counted loop** | Loop until a predicate goes false, with a distinct loop config. | looping/never-settles | **[deferred]** |
| **Time-driven ambient motion** | Drive continuous effects from an ever-increasing time value (clocks, waves, generative). | looping/never-settles, frame-exact-timing | **[v1]** — `createElapsed` + derive |
| **Marquee / infinite ticker** | Continuously scroll a strip of content, optionally draggable/cursor-reactive. | looping/never-settles | **[deferred]** — loop; `createElapsed` partial |
| **Shimmer / skeleton loading** | Sweep a highlight across placeholder shapes while content loads. | looping/never-settles | **[v1]** — `createElapsed` sweeps offset |
| **Indeterminate spinner/bar** | Perpetual loop reassuring the user work is happening. | looping/never-settles | **[v1]** — `createElapsed` |
| **Live recording / status pulse** | Idle badge or call-to-action loops continuously to signal status. | looping/never-settles | **[deferred]** |

# Microinteractions & Feedback

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Hover feedback** | Lift/scale/glow/recolor while pointer is over, reverting on leave. | interruption/velocity-carry | **[v1]** — drive a hover signal into `createSpring` |
| **Press / tap feedback** | Tactile push-down while pressed, springing back on release. | interruption/velocity-carry | **[v1]** |
| **Keyboard focus highlight** | Animate a control's appearance when it gains keyboard/programmatic focus. | interruption/velocity-carry | **[v1]** |
| **Long-press interaction** | Trigger animation after a sustained press (reveal menu, lift handle). | gesture-velocity, frame-exact-timing | **[deferred]** — gesture helper |
| **Toggle / switch snap** | Slide a knob and cross-fade track color with a crisp snap. | multi-property coordination | **[v1]** |
| **Like / favorite burst** | Heart bursts, fills, and bounces on tap. | timeline/sequencing, multi-property coordination | **[deferred]** — sequence/particles |
| **Squash & stretch on tap** | Deform (compress on press, stretch on release) so taps feel physical. | interruption/velocity-carry, multi-property coordination | **[v1]** |
| **Anticipation wind-up** | Pull back/dip before the main motion to prime the user. | timeline/sequencing | **[deferred]** — sequence (await settle) |
| **Overshoot & settle** | Entering element shoots past target and bounces back. | interruption/velocity-carry | **[v1]** — `createSpring` bounce |
| **Follow-through / overlapping** | Trailing parts keep moving and settle after the main element stops. | multi-property coordination, frame-exact-timing | **[v1]** — staggered springs via delay/index |
| **Secondary supporting motion** | Subtle complementary movement reinforcing the primary action. | multi-property coordination | **[v1]** — derive many |
| **Attention / nudge cue** | Briefly wiggle/bounce/glow an idle control to draw attention. | looping/never-settles | **[deferred]** — repeat |
| **Error shake / invalid** | Shake/flash a field on invalid input. | timeline/sequencing | **[deferred]** — sequence; or `createElapsed`-driven decay |
| **Success confirmation flourish** | Checkmark draw-on, confetti, pop on completion. | timeline/sequencing, typed-interpolation | **[deferred]** |
| **Screen shake / impact** | Short whole-view jolt on a significant event. | frame-exact-timing, looping/never-settles | **[v1]** — `createElapsed`-driven decaying offset |
| **Particle / burst** | Emit short-lived particles (sparkles, hearts) on an action. | frame-exact-timing, multi-property coordination | **[needs-decision]** — many ephemeral drivers |
| **Haptic-synced motion** | Pair visual animation with a vibration pulse on the same beat. | frame-exact-timing | **[v1]** — settle-promise / milestone fires haptic |
| **SF Symbol / icon microinteractions** | Built-in icon feedback: bounce, pulse, wiggle, breathe. | designer-authored, looping/never-settles | **[deferred]** — platform/designer |
| **Badge / count change pop** | Unread count pops/scales/shakes when it increments. | interruption/velocity-carry | **[v1]** |
| **Reward / delight microinteraction** | Personality flourish layered onto a routine action. | timeline/sequencing | **[deferred]** |

# Physics & Interruption

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Spring settle** | Value springs to target with natural overshoot/damping. | interruption/velocity-carry | **[v1]** — `createSpring` |
| **Live-target spring tracking** | Continuously chase a moving target so the follower lags and catches up (cursor follower, smoothed pointer). | interruption/velocity-carry | **[v1]** — `createSpring(()=>signal)` |
| **Tween / eased change** | Animate over a set duration with a chosen easing curve. | typed-interpolation | **[deferred]** — curves/tween layer; `createMotion` is the hook |
| **Interruptible / retargeting** | Reroute an in-flight animation to a new target carrying current velocity. | interruption/velocity-carry | **[v1]** — core promise of spring |
| **Velocity hand-off** | Seed a spring with a starting velocity so motion continues from a gesture/prior anim. | interruption/velocity-carry, gesture-velocity | **[v1]** — `set(x,{velocity})` |
| **Decay / momentum / fling** | Coast to a stop from initial velocity with no fixed target. | gesture-velocity | **[needs-decision]** — decay sim distinct from spring |
| **Velocity-driven decay (any prop)** | Glide any numeric property to a stop honoring velocity + resistance. | gesture-velocity | **[needs-decision]** |
| **Spin-to-stop** | Flick a rotating element (wheel, dial) and let it decelerate to rest. | gesture-velocity | **[needs-decision]** |
| **Projectile / gravity** | Animate with 2D physics (velocity, angle, gravity, friction). | frame-exact-timing | **[needs-decision]** — gravity sim |
| **Custom bounce easing** | Author realistic bounce with optional squash/stretch. | typed-interpolation | **[deferred]** — curves |
| **Custom wiggle / oscillation** | Shake/wobble/jiggle eases with chosen oscillations and decay. | looping/never-settles | **[deferred]** |
| **Rough / jittery easing** | Controlled randomness for hand-drawn/glitchy/organic feel. | typed-interpolation | **[deferred]** |
| **Damping-ratio / frequency springs** | Specify by natural frequency + damping ratio (predictable bounce count). | interruption/velocity-carry | **[v1]** — `createSpring` config |
| **Clamp / overshoot control** | Stop a spring exactly at a boundary (progress bars must not exceed 100%). | interruption/velocity-carry | **[needs-decision]** — clamp option on spring |
| **Platform-matched presets** | Ready iOS/Material spring presets (smooth, bouncy, snappy, interactive). | interruption/velocity-carry | **[deferred]** — named presets layer |
| **Additive / layered animation** | Stack animations on one property that add/accumulate (continuous spin + one-off nudge). | multi-property coordination, interruption/velocity-carry | **[needs-decision]** — additive composition |
| **Cancel / stop on demand** | Interrupt an in-flight animation immediately (new gesture, navigate away). | interruption/velocity-carry | **[v1]** — retarget/`set(instant)` |
| **Pause and resume** | Freeze mid-flight and resume from where it stopped. | frame-exact-timing | **[needs-decision]** |
| **Instant set (no animation)** | Jump straight to target with no tween (sync to external state, first paint). | frame-exact-timing | **[v1]** — `set(x,{instant})` |

# Gestures & Drag

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Drag to move** | Element follows the finger 1:1 along x/y, optionally axis-locked. | gesture-velocity, frame-exact-timing | **[needs-decision]** — `set(instant)` per pointer event works; gesture helper deferred |
| **Drag within bounds + elastic** | Constrain dragging to a region with rubber-band resistance past edges. | gesture-velocity, typed-interpolation | **[deferred]** — gesture helper |
| **Throw / fling with momentum** | Release a dragged element so it coasts and decelerates, bouncing off constraints. | gesture-velocity | **[deferred]** — decay + gesture |
| **Snap-back / snap-to-position** | Send a dragged element to origin or nearest snap point on release. | gesture-velocity, interruption/velocity-carry | **[v1]** — `set(target,{velocity})` spring |
| **Drag mapped to non-position prop** | Drive rotation/scale/hue/slider from a drag gesture. | gesture-velocity | **[v1]** — derive from drag signal |
| **Drag release spring-back** | Spring back to rest or fling to snap point carrying gesture velocity. | gesture-velocity, interruption/velocity-carry | **[v1]** |
| **Swipe-to-dismiss / swipe-action row** | Reveal actions or dismiss an item by swiping past a threshold. | gesture-velocity, presence/exit | **[deferred]** — gesture + presence |
| **Pinch-to-zoom** | Scale an image/view with a two-finger pinch driving a value. | gesture-velocity | **[deferred]** — gesture helper |
| **Two-finger rotation** | Rotate an element with a rotation gesture. | gesture-velocity | **[deferred]** |
| **Composed gestures** | Combine simultaneous/race/exclusive gestures (pinch+pan+rotate, tap-vs-doubletap). | gesture-velocity | **[deferred]** |
| **Card-stack / Tinder swipe** | Top draggable card flung away while the stack springs forward. | gesture-velocity, presence/exit, multi-property coordination | **[deferred]** |
| **Pull-to-refresh / rubber-band** | Resist and overshoot at boundaries, snapping back elastically; release triggers refresh. | gesture-velocity, typed-interpolation | **[deferred]** |
| **Draggable reorderable list** | Drag an item to a new position while others spring out of the way. | gesture-velocity, layout/shared-element | **[deferred]** — gesture + layout |
| **Long-press lift-and-drag** | Long-press lifts an item with shadow, follows finger, neighbors shuffle. | gesture-velocity, layout/shared-element | **[deferred]** |
| **Anchored snapping drag** | Drag content that snaps to defined anchors (reveal actions, sheet detents). | gesture-velocity | **[deferred]** |
| **Bottom sheet drag and snap** | Sheet follows finger, springs to expanded/half/collapsed detents or flings closed. | gesture-velocity, interruption/velocity-carry | **[deferred]** |
| **Navigation drawer slide** | Edge-swipe slides a drawer in over a scrim, cancellable mid-swipe. | gesture-velocity | **[deferred]** |
| **Unified input observer** | Normalize wheel/touch/pointer/scroll into directional events driving any animation. | gesture-velocity, scroll-coupling | **[deferred]** |
| **Device-tilt parallax** | React to gyroscope/accelerometer to tilt/parallax UI as the phone moves. | frame-exact-timing | **[v1]** — derive from a sensor signal |
| **Keyboard-reactive layout** | Animate content in sync with the on-screen keyboard's height/state. | frame-exact-timing | **[v1]** — `createSpring(()=>keyboardHeight)` |

# Scroll-Driven

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Scroll-linked progress** | Bind a value directly to scroll position (reading bar, indicator). | scroll-coupling | **[deferred]** — scroll-linked layer; derive from scroll signal |
| **Scroll-into-view reveal** | Fire an animation once (or each time) an element enters the viewport. | scroll-coupling, frame-exact-timing | **[deferred]** |
| **Scroll-triggered fire-and-forget** | Cross a scroll offset → fire a time-based animation once, independent of speed. | scroll-coupling | **[deferred]** |
| **Parallax depth** | Move layers at different rates relative to scroll for depth. | scroll-coupling | **[deferred]** — derive many from scroll signal |
| **Sticky-pinned scroll choreography** | Pin a section and drive an internal sequence from scroll. | scroll-coupling, timeline/sequencing | **[deferred]** |
| **Scroll-velocity-reactive** | Skew/stretch/blur reacting to scroll speed and direction. | scroll-coupling, gesture-velocity | **[deferred]** |
| **Horizontal-from-vertical scroll** | Translate vertical scrolling into horizontal track movement. | scroll-coupling | **[deferred]** |
| **Collapsing / sticky header** | Shrink/fade/pin a header as the user scrolls, linked to offset. | scroll-coupling, multi-property coordination | **[deferred]** |
| **Batch scroll reveals** | Stagger many independently-watched elements as they enter, batched. | scroll-coupling, timeline/sequencing | **[deferred]** |
| **Smooth / inertial page scroll** | Replace native scrolling with eased momentum-smoothed scrolling. | scroll-coupling, gesture-velocity | **[deferred]** |
| **Programmatic scroll-to** | Animate the page/container scrolling to a target element or offset. | scroll-coupling | **[deferred]** |
| **Scroll snapping / paging** | Snap scroll to defined points/labels/pages based on velocity. | scroll-coupling, gesture-velocity | **[deferred]** |
| **Geometry-driven scroll effects** | Continuously transform an item by its live position in the viewport. | scroll-coupling | **[deferred]** |

# Sequencing & Choreography

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Staggered group reveal** | Cascade a child animation across items by distributing delays (list, grid, center-out). | timeline/sequencing | **[v1]** — stagger = delay-from-index |
| **Randomized-delay stagger** | Per-item randomized delays for a wave/scatter effect. | timeline/sequencing | **[v1]** — delay from index/random |
| **Grid-aware / from-center stagger** | Distribute delays by grid position or distance from center. | timeline/sequencing | **[v1]** — delay derived from index math |
| **Run-in-sequence chaining** | Queue discrete steps one after another without manual delay math. | timeline/sequencing | **[v1]** — sequence = await settle |
| **Sequenced animation chaining** | Run animations in order, each waiting for the previous (overshoot → settle, shake legs). | timeline/sequencing | **[v1]** — await settle |
| **Parallel / concurrent animations** | Launch several at the same instant from one trigger. | multi-property coordination | **[v1]** — one driver, derive many |
| **Parent/child orchestration** | Coordinate so parents animate before/after children (beforeChildren, delayChildren). | timeline/sequencing | **[needs-decision]** — ordering helper |
| **Imperative timeline / scrubbing** | Script multi-element choreography with overlaps/offsets/labels + play/pause/scrub/speed. | timeline/sequencing, frame-exact-timing | **[deferred]** — full timeline primitive intentionally excluded |
| **Nested timeline composition** | Group reusable segments into child timelines assembled into a master. | timeline/sequencing | **[deferred]** |
| **Multi-step keyframe sequence** | Drive one value through ordered waypoints with per-step easing/timing. | timeline/sequencing, typed-interpolation | **[deferred]** — keyframes |
| **Multi-step custom-timed keyframes** | Position keyframe stops unevenly so some segments are faster/slower. | timeline/sequencing | **[deferred]** |
| **Multi-property keyframed timeline** | Many properties each on their own keyframe track (designer-style scenes). | timeline/sequencing, multi-property coordination | **[deferred]** |
| **Mixed-interpolation keyframes** | Blend spring/cubic/linear/instant segments within one property's timeline. | typed-interpolation, timeline/sequencing | **[deferred]** |
| **Multi-stage phase loops** | Cycle a view through discrete states automatically (PhaseAnimator). | timeline/sequencing, looping/never-settles | **[deferred]** |
| **Trigger-driven phase reaction** | Play a chained multi-phase reaction once each time a counter/event fires. | timeline/sequencing | **[deferred]** |
| **State-machine / phase sequences** | Progress through named enum phases with loop/seamless/ping-pong modes. | timeline/sequencing, looping/never-settles | **[deferred]** |
| **Async scripted sequences** | Pass an async function as target to script multi-step with branching logic. | timeline/sequencing | **[v1]** — await settle in async fn |
| **Cross-hook sequencing** | Chain distinct animation hooks in a defined order with relative timing (useChain). | timeline/sequencing | **[v1]** — compose settle-promises |
| **Delayed start** | Hold an animation a set delay before it begins, per-key if needed. | timeline/sequencing | **[v1]** — `{delay}` / `set(x,{delay})` |
| **Reverse / replay control** | Run backwards or reset to replay without re-creating the element. | timeline/sequencing | **[needs-decision]** — replay easy, reverse needs curves |
| **Manual keyframe scrubbing** | Evaluate a keyframe timeline at an arbitrary time from scroll/clock. | scroll-coupling, frame-exact-timing | **[deferred]** |
| **Sequenced/curved/jumping/fading layout moves** | Choose how layout changes animate — X-then-Y, curved, jump, crossfade. | layout/shared-element, timeline/sequencing | **[deferred]** |
| **Audio / media sync** | Land animation beats on audio/media cues. | frame-exact-timing, timeline/sequencing | **[needs-decision]** — `createElapsed` from media clock |

# Shared-Element & Layout

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Shared-element / hero transition** | Morph one element into another across views, matching position/size/shape. | layout/shared-element, interruption/velocity-carry | **[deferred]** — Hero layer |
| **Spring/velocity-aware hero + drag-to-dismiss** | Hero flight with spring physics; drag destination back to dismiss with momentum. | layout/shared-element, gesture-velocity | **[deferred]** |
| **Custom flight shuttle / morph** | Customize mid-flight render (fade, 3D flip, color fade-through). | layout/shared-element, multi-property coordination | **[deferred]** |
| **Continuous target tracking in flight** | Keep a hero locked onto a target whose position shifts mid-flight. | layout/shared-element, interruption/velocity-carry | **[deferred]** |
| **Container transform (expand to page)** | Grow a card/FAB/tile seamlessly into a full detail page and back. | layout/shared-element, presence/exit | **[deferred]** |
| **Selective geometry matching** | Sync only some geometry (position vs size) between matched views. | layout/shared-element | **[deferred]** |
| **Zoom navigation transition** | Expand a tapped thumbnail into a detail screen and collapse on dismiss. | layout/shared-element | **[deferred]** |
| **Automatic layout (FLIP)** | Animate position/size changes from layout shifts without computing deltas. | layout/shared-element | **[deferred]** |
| **List reordering** | Items rearrange as a list sorts or drag-reorders, neighbors sliding into place. | layout/shared-element | **[deferred]** |
| **Layout group sync** | Coordinate layout animations across siblings that don't re-render together (tab underline). | layout/shared-element, multi-property coordination | **[deferred]** |
| **Scale-distortion correction** | Keep border-radius/shadows/children undistorted while a parent scales. | layout/shared-element, multi-property coordination | **[deferred]** |
| **Reparenting continuity** | Keep an element visually continuous while it moves to a different parent. | layout/shared-element | **[deferred]** |
| **Auto height/size animation** | Animate width/height to/from auto/content size (panels, accordions). | layout/shared-element, typed-interpolation | **[needs-decision]** — measured target |
| **Animate layout content-size change** | Smoothly resize a box when content grows/shrinks (text wrapping). | layout/shared-element | **[needs-decision]** |
| **Shared-bounds (different content)** | Animate a container's bounds between states whose contents differ. | layout/shared-element, presence/exit | **[deferred]** |
| **Reposition within a stack** | Animate a child's absolute/relative position inside a Stack as targets change. | typed-interpolation | **[v1]** — derive position from signal |

# Navigation & Overlays

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Page / route transition** | Cross-fade, wipe, curtain, or slide between full views during navigation. | presence/exit, multi-property coordination | **[deferred]** |
| **Directional navigation transition** | Forward vs back animates in the matching direction by navigation type. | presence/exit | **[deferred]** |
| **Shared-axis transition** | Slide+fade between sequential screens/steps along x/y/z. | presence/exit, multi-property coordination | **[deferred]** |
| **Fade-through between unrelated views** | Cross-dissolve between destinations with no spatial relationship (tabs). | presence/exit | **[deferred]** |
| **Fade-scale for modals/menus** | Pop dialogs/menus/snackbars in/out with fade + subtle scale. | presence/exit | **[deferred]** |
| **Persistent UI across navigation** | Header/sidebar/nav stays continuous while only content transitions. | layout/shared-element | **[deferred]** |
| **Overlay / modal choreography** | Animate dialogs, sheets, drawers, popovers, toasts entering, stacking, dismissing. | presence/exit, multi-property coordination | **[deferred]** |
| **Popover/dialog top-layer open-close** | Animate a top-layer element in/out without ancestor-overflow clipping on exit. | presence/exit | **[deferred]** |
| **Menu / navigation expansion** | Animate dropdowns, mega-menus, command palettes, radial/floating menus. | presence/exit, multi-property coordination | **[deferred]** |
| **FAB morph / speed-dial expand** | A FAB expands into a toolbar or fans out a radial menu, then collapses. | multi-property coordination, presence/exit | **[deferred]** |
| **Accordion / collapse** | Smoothly expand/collapse height of disclosure sections. | typed-interpolation, layout/shared-element | **[needs-decision]** — auto-size target |
| **Toast / snackbar enter-and-exit** | Slide up, dwell, slide/fade away, with optional action and auto-dismiss progress. | presence/exit, timeline/sequencing | **[deferred]** |
| **Search / filter morph** | Expand a search icon into a full bar (or chip into sheet) and morph results in. | layout/shared-element, presence/exit | **[deferred]** |
| **Tab indicator slide** | Active underline/pill glides to the new tab while content cross-fades. | layout/shared-element | **[deferred]** — layout group sync |
| **Carousel / slider paging** | Drag/swipe/scroll through paged content with snapping and looping. | gesture-velocity, scroll-coupling | **[deferred]** |
| **Carousel paging effects** | Animate item scale/opacity/rotation as pages scroll past. | scroll-coupling, multi-property coordination | **[deferred]** |

# Lists & Collections

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Enter/leave list churn** | Animate items in and out as a collection's members change. | presence/exit | **[deferred]** |
| **In-place item update** | Animate existing items that change value/position without remounting. | interruption/velocity-carry, layout/shared-element | **[v1]** for value; **[deferred]** for relayout |
| **Inserted / removed item with neighbor shift** | A row animates in/out while neighbors slide to fill the gap. | presence/exit, layout/shared-element | **[deferred]** |
| **Independent multi-spring orchestration** | Many springs with separate per-item targets/configs in one place (grid). | multi-property coordination | **[v1]** — map signals → springs |
| **Animation-only-once-on-first-paint guard** | Entrance fires only on first appearance, not on scroll-back-into-view. | presence/exit, frame-exact-timing | **[needs-decision]** — entrance lifecycle |
| **Resize-responsive animation** | Re-run/retarget animations on element/viewport size change. | layout/shared-element | **[v1]** — `createSpring(()=>size)` |

# Typed Values (Color · Path · Number · Vector)

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Color animation** | Interpolate colors across formats (hex/rgb/hsl/oklch) including cross-format/color-space. | typed-interpolation | **[v1]** — `lerpColor` |
| **Gradient animation** | Animate gradient stops/sweeps. | typed-interpolation | **[needs-decision]** — gradient interp helper |
| **Filter animation** | Animate blur and other CSS-filter-like effects. | typed-interpolation | **[v1]** — `lerp` on filter value |
| **Vector / offset / size / rect** | Interpolate Offset, Size, Rect, Alignment, IntOffset with independent physics per dimension. | typed-interpolation, multi-property coordination | **[v1]** — `lerpVec` + per-dim spring |
| **Transform string composition** | Interpolate numbers into composed transform strings (translate/rotate/scale) with units. | typed-interpolation, multi-property coordination | **[v1]** — derive composed string |
| **Animated number / counter ticker** | Roll a numeric value up/down with formatting (stats, prices, scores, odometer). | typed-interpolation | **[v1]** — `createMotion` on number |
| **Numeric text roll** | Animate changing digits rolling like an odometer. | typed-interpolation, presence/exit | **[needs-decision]** — per-digit presence |
| **Custom animatable value type** | Drive animation over a domain/composite type via a converter to a vector. | typed-interpolation | **[needs-decision]** — custom `lerp` plug-in |
| **Derived / transformed value mapping** | Map one animated value onto another (range remap, interpolation) for secondary effects. | typed-interpolation | **[v1]** — one driver, derive many |
| **Range remapping with extrapolation** | Map a driver to another range with clamp/extend/identity extrapolation. | typed-interpolation | **[v1]** — `lerp` + clamp in derive |
| **Derived / dependent animated values** | Compute a value from other shared values so dependents stay in sync. | multi-property coordination | **[v1]** — derived signals |
| **Velocity tracking / derived motion** | Compute rate of change of a value and drive other effects from it. | interruption/velocity-carry | **[needs-decision]** — expose velocity readout |
| **CSS variable / custom property animation** | Animate custom properties as both targets and cascading inputs. | typed-interpolation | **[v1]** — derive into variable |
| **Squash-and-stretch / distortion** | Cartoon squash/stretch/overshoot via spline on scale axes. | typed-interpolation, multi-property coordination | **[deferred]** — keyframe splines; spring covers simple |
| **Stateless utility interpolation** | Standalone helpers (lerp, damp, clamp, mapRange, snap) outside a full animation. | typed-interpolation | **[v1]** — `lerp/lerpColor/lerpVec` exported |
| **Forcefeeding / known start values** | Provide explicit start values to skip layout reads and guarantee from-state. | frame-exact-timing | **[v1]** — `{from}` is exactly this |

# Vector / SVG / Path

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **SVG line / stroke draw-on** | Reveal a stroke by animating dash offset (signature, logo, handwriting). | typed-interpolation | **[v1]** — `createMotion` on dash offset |
| **SVG / path shape morph** | Tween one vector shape/icon into another regardless of point count. | typed-interpolation | **[needs-decision]** — path interpolator (flubber-style) |
| **Icon / shape morph** | Transform one icon into another along a path (hamburger↔close, play↔pause). | typed-interpolation | **[needs-decision]** |
| **Motion along a path** | Move an element following a curve/arc rather than a straight line. | typed-interpolation | **[needs-decision]** — path-sampling helper |
| **Orient to travel direction** | Auto-rotate to face direction of motion along a path. | typed-interpolation, multi-property coordination | **[deferred]** |
| **Radial / orbital positioning** | Arrange/animate items around a center using angular paths (orbit, radial menu, clock hand). | typed-interpolation | **[v1]** — derive x/y from angle signal |
| **Path editing helper** | Interactively author/tune a motion path during development. | designer-authored | **[deferred]** |
| **SVG attribute animation** | Animate raw SVG attributes (viewBox, points, cx/cy/r, progress) not exposed as styles. | typed-interpolation | **[v1]** — derive attribute from signal |
| **Animating non-style props** | Animate component props that aren't styles (blur radius, TextInput value, third-party). | typed-interpolation | **[v1]** — derive any prop |
| **Animated GLSL shader** | Time-driven fragment shaders for ripples, dissolves, glows, distortions. | frame-exact-timing | **[v1]** — `createElapsed` → uniform |
| **Mesh deformation / warping** | Deform art with weighted meshes (squash, cloth, facial). | designer-authored | **[deferred]** |
| **Draw-order / layer reordering** | Animate which shapes render in front over time. | designer-authored, frame-exact-timing | **[deferred]** |

# Text

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Per-unit text reveal** | Split into lines/words/chars and animate each independently (staggered, wavy, scatter). | timeline/sequencing, multi-property coordination | **[v1]** — stagger by index over split units |
| **Text scramble / decode** | Cycle random chars before resolving to final text (decrypt/hacker). | frame-exact-timing | **[v1]** — `createElapsed`-driven char swap |
| **Typewriter / text replace** | Type out, count up, or swap text content char-by-char. | frame-exact-timing | **[v1]** — derive substring from progress |
| **Animated text style** | Interpolate font size/weight/color/spacing as style changes. | typed-interpolation, multi-property coordination | **[v1]** — `lerp`/`lerpColor` on style |
| **Kinetic typography** | Scale/rotate/translate/recolor text with sub-pixel motion (emphasized words). | typed-interpolation, multi-property coordination | **[v1]** |
| **Gradient sweep across glyphs** | Sweep a color/gradient across text glyphs. | typed-interpolation, looping/never-settles | **[needs-decision]** — gradient interp |
| **Dynamic / localized text swap** | Swap text shown at runtime without re-authoring. | presence/exit | **[deferred]** — content swap |

# Data-Viz

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Chart entrance reveal** | Bars grow, lines draw on, arcs sweep in on first render. | timeline/sequencing, typed-interpolation | **[v1]** — staggered drivers per series |
| **Chart data-update transition** | Bars/points/needles tween between old and new values on data change (bar-chart race). | interruption/velocity-carry, typed-interpolation | **[v1]** — `createMotion(()=>datum)` |
| **Data-driven counter / gauge** | Drive a counter, gauge, or progress ring from live data. | typed-interpolation, interruption/velocity-carry | **[v1]** |
| **Per-datum spring animation** | Animate bar heights, line/area paths, gauge needles with per-datum springs. | multi-property coordination, interruption/velocity-carry | **[v1]** — map data → springs |
| **Determinate progress fill** | Fill a bar/ring proportionally for a known-duration task. | typed-interpolation | **[v1]** — `createMotion(()=>progress)` |
| **Chart via attributes/paths** | Animate chart through SVG attrs, paths, and counters. | typed-interpolation | **[v1]** — derive attrs |

# Media & Maps

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Media lightbox open + pinch-zoom** | Expand a photo fullscreen; pinch/pan to zoom with rubber-band overscroll, swipe-down to close. | gesture-velocity, layout/shared-element | **[deferred]** |
| **Video scrubber / play-pause controls** | Scrub a timeline or toggle play; thumb/buffered ranges/overlay fade and track. | frame-exact-timing, scroll-coupling | **[needs-decision]** — media-clock driver |
| **Media / scrubbable playback motion** | Drive animation from a media timeline or let the user scrub it. | frame-exact-timing | **[needs-decision]** |
| **Map camera flythrough** | Animate map camera center/heading/distance independently along a route. | multi-property coordination, timeline/sequencing | **[v1]** — derive camera from one driver |
| **Map marker drop / bounce / move** | Pins drop/bounce/glide between coordinates as location updates; camera follows. | interruption/velocity-carry, typed-interpolation | **[v1]** — `createSpring(()=>coord)` |
| **Canvas / WebGL object animation** | Drive canvas/WebGL object props with the same engine for render-loop visuals. | frame-exact-timing | **[v1]** — `createElapsed`/derive → render |
| **3D scene / object animation** | Animate 3D meshes, camera, material props. | frame-exact-timing, multi-property coordination | **[v1]** — drive values, push to renderer |

# Designer-Authored

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Designer-authored timeline playback** | Play a polished pre-built vector animation keyframed in a tool. | designer-authored | **[deferred]** — Lottie/Rive ecosystem |
| **State-machine UI component states** | Drive a control through Idle→Hover→Pressed→Active→Disabled with the right anim per transition. | designer-authored, timeline/sequencing | **[deferred]** |
| **State machine transitions w/ conditions** | Move between states only when guard conditions hold, with duration/easing. | designer-authored | **[deferred]** |
| **Concurrent layered state machines** | Multiple independent state-machine layers blending on one graphic. | designer-authored | **[deferred]** |
| **Blend / mix between animations** | Interpolate or additively layer timelines by one parameter (1D/additive/direct blend). | designer-authored, multi-property coordination | **[deferred]** |
| **Joystick / 2D parameter control** | Drive a rich pose from one or two continuous control values. | designer-authored, multi-property coordination | **[deferred]** |
| **Input contract (bool/number/trigger)** | Expose typed inputs the app sets at runtime that the animation reacts to. | designer-authored | **[deferred]** |
| **Events emitted to host app** | Animation fires named events back to code at meaningful moments. | designer-authored, frame-exact-timing | **[deferred]** |
| **Data binding to live app state** | Bind a view-model property to real data so visuals update reactively. | designer-authored, typed-interpolation | **[needs-decision]** — signals ARE this binding |
| **Two-way / runtime-controlled bound values** | Read and write bound properties at runtime from code. | designer-authored | **[needs-decision]** |
| **Converters / value transforms** | Translate a bound value through math/format/group converters before it drives visuals. | typed-interpolation | **[v1]** — derive in the read |
| **Nested view models & lists** | Compose structured/repeating data to drive collections of animated components. | designer-authored, multi-property coordination | **[deferred]** |
| **Dynamic property override (key-path)** | Override any named property from code via key-path. | designer-authored | **[deferred]** |
| **Theming / color override** | Re-color an animation at runtime via exposed color slots/tokens. | designer-authored, typed-interpolation | **[deferred]** |
| **Motion tokens for production data** | Expose animation values as named tokens bound to real data. | designer-authored | **[deferred]** |
| **Expression-scripted behavior** | Embed small scripts so properties compute themselves / hold state. | designer-authored | **[deferred]** |
| **Sequencing via segments/markers** | Play named segments/markers in sequence or jump to labeled sections. | designer-authored, timeline/sequencing | **[deferred]** |
| **Dynamic asset swapping** | Replace fonts/images/audio loaded by the animation at runtime. | designer-authored | **[deferred]** |
| **Skeletal / bone rigging** | Animate characters with bones, IK, follow-path constraints. | designer-authored | **[deferred]** |
| **Constraints-driven motion** | Drive one object's properties from another (follow path, IK, transform). | designer-authored | **[deferred]** |
| **Responsive layout reflow (authored)** | Animation/layout reflows responsively to its container (N-slice resizable art). | designer-authored, layout/shared-element | **[deferred]** |
| **Reusable animated components / nested artboards** | Compose a screen from self-contained components exposing inputs/events. | designer-authored | **[deferred]** |
| **Raster import & layered art** | Bring in raster/PSD/PNG art with layers preserved and animate it. | designer-authored | **[deferred]** |
| **Vector feathering & clipping** | Soften edges and clip/mask as part of the animated look. | designer-authored | **[deferred]** |
| **Audio / sound-effect triggers** | Play user-triggered sound effects in sync with the visual. | designer-authored, frame-exact-timing | **[needs-decision]** — milestone callback |
| **Cursor / scroll sync mode** | Auto-bind whole-animation progress to cursor or scroll with one setting. | scroll-coupling, designer-authored | **[deferred]** |

# Playback Control & Lifecycle

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Imperative start/stop/retarget** | Trigger, retarget, or halt animations imperatively from outside render (event handlers). | interruption/velocity-carry | **[v1]** — imperative `set(x,…)` |
| **Playback control & scrubbing** | Play, pause, reverse, seek, restart, finish, cancel, set progress/timeScale. | timeline/sequencing, frame-exact-timing | **[deferred]** — full transport (timeline) |
| **Variable / dynamic playback speed** | Speed up, slow down, or scrub by changing playback rate at runtime. | frame-exact-timing | **[deferred]** |
| **Animation lifecycle hooks** | React to ready/start/change/each-iteration/finish/pause/resume milestones. | frame-exact-timing | **[v1]** — `onChange`/settle-promise; **[needs-decision]** for iteration/pause |
| **Completion callback** | Run code when an animation finishes (settle-complete vs logically-complete). | frame-exact-timing | **[v1]** — settle-promise |
| **Reacting to value-cross threshold** | Fire side-effect logic when a value crosses a threshold (prev vs current). | frame-exact-timing | **[v1]** — `createEffect` on the signal |
| **Commit final animated state** | Keep the styles animated to (write back to inline) after the animation ends. | frame-exact-timing | **[v1]** — signal holds final value |
| **Promise-based completion / chaining** | Await `finished` to chain follow-up logic. | timeline/sequencing | **[v1]** — settle-promise |
| **Discover & coordinate existing animations** | Query all running animations to pause/await/coordinate globally. | frame-exact-timing | **[deferred]** — registry |
| **Global ticker / render loop** | One synchronized frame loop with lag smoothing driving custom per-frame logic. | frame-exact-timing, looping/never-settles | **[v1]** — `createElapsed` is the shared clock |
| **Per-frame update callback** | Hook every frame to push computed values into a custom/imperative renderer. | frame-exact-timing | **[v1]** — effect on `createElapsed` |
| **Standalone timer / ticker** | Pure time loop with playback controls, independent of any property. | frame-exact-timing, looping/never-settles | **[v1]** — `createElapsed` |
| **Real-time value modifier** | Post-process animated values every frame (wrap/loop/snap/clamp/noise). | frame-exact-timing, typed-interpolation | **[v1]** — derive with modifier |
| **High-frequency value rendering** | Push rapidly-changing values straight to the target to avoid re-rendering the tree. | frame-exact-timing | **[v1]** — signal write → fine-grained update |
| **Frame-synchronized custom driving** | Manually advance an animation per frame and read its value at any play time. | frame-exact-timing | **[needs-decision]** — manual advance API |
| **Timeline dev tooling** | Scrub/inspect/debug complex sequences with a visual UI. | designer-authored | **[deferred]** |

# Accessibility & Performance

| Use case | Description | Stresses | Scope |
|---|---|---|---|
| **Reduced-motion variant** | Detect prefers/OS reduced-motion and disable or swap for gentle fades. | frame-exact-timing | **[needs-decision]** — global reduced-motion switch |
| **Global skip / disable for testing** | Jump all animations to targets instantly (tests, SSR, perf-constrained). | frame-exact-timing | **[needs-decision]** — global skip flag |
| **Global transition defaults** | Set a baseline transition (+ reduced-motion) once, cascading to descendants. | multi-property coordination | **[needs-decision]** — config/context |
| **Responsive / scoped config** | Different animations per breakpoint/media query that cleanly revert. | multi-property coordination | **[needs-decision]** |
| **Off-main-thread compositor animation** | Run transform/opacity (and scroll-driven) on the compositor at 60fps while main thread is busy. | frame-exact-timing | **[needs-decision]** — Flutter/Dart-side coupling |
| **UI-thread 60/120fps via worklets** | Run animation/gesture logic off the JS thread so motion stays smooth. | frame-exact-timing | **[needs-decision]** — bridge already drives 60fps |
| **Performance-tuned draw-phase animation** | Animate transform/offset/alpha without triggering recomposition/relayout. | frame-exact-timing | **[v1]** — fine-grained signal → draw-only |
| **Reduce-motion / fps throttling** | Cap frame rate or animation cost for performance/accessibility. | frame-exact-timing | **[needs-decision]** |

---

**Scope tally:** v1 covers the broad center — single-driver springs/motions/elapsed, entrance via `{from,delay}`, follow via `createSpring(()=>signal)`, imperative `set` with `{instant|delay|velocity}` + settle-promise, stagger by index, sequence by await, and "one driver, derive many" (which absorbs most multi-property, typed-value, derived-mapping, counter, text, data-viz, and per-frame cases).

**The deferred clusters are coherent:** presence/exit (gates nearly all list churn, route transitions, overlays, content swaps), gesture helpers (drag/pinch/swipe/decay), scroll-linked, repeat/loop, curves/tween, named presets, and shared-element/Hero — matching the planned deferral list exactly.

**Highest-value [needs-decision] items for v1 design** (recurred across many sources, sit just outside the stated core):
1. **Decay / momentum / fling** — distinct simulation from spring; underpins every throw/inertial-scroll/spin-to-stop case and is the natural partner to `set(x,{velocity})`.
2. **Clamp / overshoot bound on spring** — required for progress bars and anchored snaps; small addition.
3. **Auto/content-size target** — gates accordion, collapse, auto-height; the only common entrance/layout case `{from}` can't express because the target is measured, not known.
4. **Path interpolation** (morph + motion-along-path) — recurs in every source; needs a typed-interpolation plug-in shape beyond `lerp/lerpColor/lerpVec`.
5. **Velocity readout** — exposing a driver's current velocity unlocks velocity-tracking/derived-motion and clean gesture hand-off without a separate gesture layer.
6. **Reduced-motion / global-skip switch** — cheap, accessibility-critical, appears in 6+ sources; a global flag that makes `set` resolve instantly.

---

# Missing & Under-Represented Animation Use Cases

The catalog is strong on the "happy path" of a signal-based API. The gaps cluster in **lifecycle/environment transitions**, **multi-driver coordination failure modes**, **non-visual sync**, **input modalities beyond touch/mouse**, and **the unglamorous correctness cases** that APIs routinely get wrong. Below, only items I could not find adequately represented.

## Lifecycle, Visibility & Environment Transitions
These are almost entirely absent — the catalog assumes an animation lives its whole life on one always-visible surface.

- **Backgrounded / suspended app resume** — tab/app loses focus mid-flight; on resume, snap-to-end vs catch-up vs replay (a multi-second elapsed jump must not produce a giant velocity spike).
- **Offscreen / occluded animation suspension** — element scrolled out of viewport or behind an opaque overlay; pause the driver and resume coherently, not burn frames.
- **Display refresh-rate change mid-animation** — 60↔120Hz switch (ProMotion throttle, external monitor, battery-saver), or variable-refresh-rate panels; timestep must stay correct.
- **Frame-rate drop / dropped-frame recovery (jank)** — large `dt` after a stall: clamp/substep the integrator so a spring doesn't explode or teleport.
- **Wall-clock / timezone discontinuity** — `createElapsed` driven from a clock when system time jumps (NTP sync, DST, manual change) shouldn't lurch.
- **Hot-reload / fast-refresh state preservation** — in-flight animation survives a dev reload without restarting from zero or losing velocity.
- **SSR / first-paint hydration coherence** — server-rendered initial frame must match the client's pre-animation state so there's no hydration flash (distinct from the `{from}` first-paint case, which is client-only).
- **Window/container resize *during* an in-flight animation** — target derived from size changes mid-spring; covered for re-target *trigger* but not for "resize storm" debouncing/coalescing.
- **Foldable / hinge / orientation-change reflow** — discrete posture change retargets many drivers at once; landscape↔portrait.

## Input Modalities Beyond Touch & Mouse
The Gestures section is touch/pointer-centric. Whole input classes are missing.

- **Focus-traversal / spatial-navigation motion (TV / remote / D-pad)** — directional focus ring that flies between widgets; no pointer exists. Critical for TV and car platforms.
- **Keyboard-arrow / type-ahead driven motion** — listbox/menu highlight gliding via arrow keys or first-letter jump (distinct from "focus highlight" microinteraction).
- **Gamepad / analog-stick continuous drive** — pressure/axis as a live signal, with deadzone and non-linear response curves.
- **Stylus / pressure / tilt / barrel-rotation input** — Apple Pencil / Wacom pressure and azimuth driving stroke width, scale, or rotation.
- **Hover-intent / proximity (pre-touch)** — distance-to-cursor or near-finger proximity (some panels) ramps an effect before contact.
- **Scroll-wheel / trackpad-precision vs notched-wheel** — discrete notch vs high-resolution pixel deltas need different smoothing; momentum from a trackpad fling.
- **Multi-pointer / multi-user simultaneous drag** — two fingers (or two users on a shared surface) each driving an independent element; pointer-capture identity.

## Multi-Driver Coordination & Interruption Corner Cases
The "one driver, derive many" story hides the hard cases where *many independent drivers* interact.

- **Mid-flight target oscillation / thrash** — target signal flips rapidly (debounce/hysteresis) so the follower doesn't jitter or never settle.
- **Settle-promise resolution under retarget** — what `finished` resolves to when the target changes before settling: does the old promise reject, resolve, or silently re-aim? (A classic API footgun, only obliquely touched.)
- **Stale-closure / superseded animation** — an awaited sequence step whose element was unmounted or whose driver was superseded must abort cleanly, not write to a dead signal.
- **Cross-driver phase locking** — keep two independent springs in lockstep (mirrored panels) despite different start times/velocities.
- **Conflicting writers to one value** — gesture and a spring both try to own the same property in the same frame; arbitration / last-writer / additive blend (additive is listed, but not the *conflict-resolution* policy).
- **Epsilon / rest-threshold tuning** — when is a spring "done"? Sub-pixel rounding, snapping to integer device pixels at rest, and avoiding shimmer on a "settled" value.
- **Catch-up after long synchronous block** — main thread blocked (big layout, GC pause); first frame after must not visibly jump.
- **Coalescing many same-frame signal writes** — N derived props updated in one tick should produce one frame, not N (batching correctness, not just perf).

## Non-Visual & Cross-Sensory Sync
Haptics get one line; the broader sensory-sync surface is thin.

- **Continuous haptic texture (not a single pulse)** — drag along a ridged control producing a stream of haptic ticks keyed to position, not one beat.
- **Audio reactive (input) — FFT/amplitude driving visuals** — mic or playback spectrum feeding a driver (visualizer); the catalog only has visuals→audio *triggers*, not audio→visuals.
- **Screen-reader / live-region coordination** — announce a value change once at settle, not on every interpolated frame; pause/suppress motion-derived announcements.
- **Text-to-speech / caption timing sync** — land caption highlights or word emphasis on a speech clock.
- **Synchronized cross-device / multi-screen animation** — same animation on phone + cast/second screen staying in sync over a network clock (companion screens, presentations).
- **Notification / ambient peripheral motion** — LED, edge-glow, always-on-display pulse driven by the same primitive at low frame rates.

## Accessibility (Beyond the One reduced-motion Flag)
`prefers-reduced-motion` is flagged as needs-decision, but accessibility is broader than a global off-switch.

- **Reduced-motion *substitution*, not just disable** — swap a slide/zoom for a cross-fade (vestibular-safe) rather than snapping instantly; the catalog's framing is binary.
- **Vestibular-trigger classification** — distinguish parallax/zoom/spin/large-translate (problematic) from opacity/color/small-scale (safe) so a global switch can be selective.
- **Reduced-transparency / increased-contrast modes** — animating blur/opacity must respect OS transparency-reduction and high-contrast settings.
- **Focus-visible-only motion** — show motion focus indicators only for keyboard users (`:focus-visible` semantics), suppress for pointer.
- **Motion as the *only* status channel (non-compliant)** — pairing every meaningful animated state change with a non-motion cue (color+icon+text) for color-blind / motion-blind users.
- **Pause/stop control for >5s or looping motion (WCAG 2.2.2)** — any indefinite loop needs a user-accessible pause; the looping cluster never mentions a required stop affordance.
- **Cognitive-load / "essential motion" tiering** — let users keep functional motion (progress, focus) while killing decorative motion.

## Performance & Resource Edge Cases
Beyond "draw-phase only" and "120fps."

- **Battery / thermal / low-power-mode throttling** — degrade frame rate or richness when the OS signals low battery, low-power mode, or thermal throttling.
- **Animation budget / over-subscription** — hundreds of simultaneous drivers; degradation policy (cap active count, drop to instant, prioritize on-screen) rather than dropping frames.
- **Memory pressure / driver leak prevention** — long-lived `createElapsed` loops and never-settling springs that are no longer observed must be reclaimed; explicit "is anyone listening?" teardown.
- **Tab-throttled / clamped timers** — background tabs clamp timers to ~1Hz; the elapsed clock must not accumulate a huge backlog.
- **Cheap-mode for low-end devices** — feature-detect and pick spring vs instant per device tier.
- **Idle-until-needed driver instantiation** — don't spin a frame loop until a value is actually being read/observed (lazy start), and stop on last unobserve.

## Typed Values & Domains Not Covered
The typed-value section is solid on color/vector/number but misses several real domains.

- **Angle / rotation shortest-path interpolation** — 359°→1° should go +2°, not −358°; wrap-aware angular lerp (also needed for hue, compass headings, clock hands).
- **3D rotation / quaternion interpolation** — flip cards, 3D tilt, globe — Euler-angle lerp gimbal-locks; needs slerp.
- **Perspective / depth (z, perspective-origin, 3D transforms)** — flip-card and "expand into page" depth that the 2D vector story can't express.
- **Logarithmic / perceptual-scale interpolation** — audio volume (dB), zoom level, font-size scaling feel wrong on a linear lerp.
- **Discrete / stepped / enum interpolation** — sprite-sheet frame index, icon-state, or any non-continuous value that must "tween" by snapping through ordered steps.
- **Box-shadow / elevation / multi-layer-shadow interpolation** — animating elevation (Material) or a list of shadows is structurally harder than one number; under-represented (only one passing mention).
- **Gradient *with changing stop count*** — interpolating between gradients that have a different number of color stops (the listed gradient case assumes matched structure).
- **clip-path / mask / shape-as-clip animation** — reveal via animated clip region (circular reveal), distinct from SVG path morph.
- **Aspect-ratio / object-fit-aware media resize** — image animating between layouts where intrinsic aspect ratio must be preserved/cross-faded.
- **Text content-length-driven layout** — animating to fit text that changes width (i18n string length swing), not just numeric ticker.

## Internationalization & Writing Direction
Entirely absent and genuinely consequential for any directional motion.

- **RTL / LTR direction-aware motion** — "slide in from the leading edge," back-nav direction, stepper increase/decrease, and stagger order must flip under RTL.
- **Vertical writing-mode motion** — CJK vertical text reveal and scroll-coupled effects run top-to-bottom / right-to-left columns.
- **Bidi / mixed-direction text reveal** — per-glyph stagger order in mixed LTR/RTL runs.
- **Locale-aware number/date ticker formatting** — the counter roll must respect grouping separators, decimal marks, and digit shaping while animating.

## Domain-Specific Surfaces With Distinct Motion
Real product areas whose motion needs don't reduce cleanly to the existing rows.

- **Camera / viewport pan-zoom (infinite canvas, maps, image editors)** — animating a transform *matrix* (pan+zoom+rotate together) with focal-point-preserving zoom; richer than "map camera," which is treated as independent scalars.
- **Form-field auto-grow / inline validation choreography** — textarea growing as you type, error message reflow, label float — coordinated layout + content + color across a field.
- **Virtualized / windowed list item recycling motion** — animating items as they're recycled into/out of the render window without entrance flashes on every scroll (your own memory notes virtualization is deferred — this is the motion consequence).
- **Real-time collaborative cursors / presence** — multiple remote cursors smoothly interpolating between sparse network updates (dead-reckoning + correction).
- **Streaming / incremental content reveal (LLM token stream, live data)** — text/data arriving in chunks animating in smoothly without re-triggering entrances per chunk.
- **Game-loop / sprite / physics-world animation** — fixed-timestep simulation with interpolated rendering (the catalog's frame model is render-driven, not fixed-step).
- **Pull-quote / split-flap / odometer with carry** — multi-digit roll where a carry cascades (9→0 ripples a tens place); the ticker rows don't address inter-digit coordination.

## API-Shape / Authoring Cases Often Missed
- **Deterministic / seeded randomness** — wiggle/scramble/scatter that's reproducible across runs and identical for snapshot tests (random delay/jitter is listed but not its testability).
- **Testability / virtual clock injection** — drive `createElapsed` from an injectable clock so animations are fast-forwardable and assertable without real time (distinct from the global skip flag).
- **Serializable / persisted animation state** — save mid-flight state (scroll position, expanded panels) and restore on reload without re-animating.
- **Imperative read of current value/velocity outside an effect** — peek the live value synchronously (for a gesture handler computing hand-off) without subscribing.
- **Driver composition / piping** — feed one driver's output as another's target through a transform stage, with correct teardown of the chain (mentioned as "derive many" but not as a *named, disposable pipeline*).

---

**Highest-signal gaps** (recur across many real systems and an API will silently get wrong if unaddressed):
1. **Backgrounding / large-`dt` recovery** — the single most common spring-explosion bug; touches every continuous driver.
2. **RTL / direction-aware motion** — silently breaks every directional animation in half the world's locales; zero coverage.
3. **Settle-promise semantics under retarget/unmount** — the interruption corner case APIs get wrong most often.
4. **Angle/quaternion shortest-path interpolation** — flip-cards, dials, headings, hue all need it; linear lerp is visibly wrong.
5. **WCAG pause control + reduced-motion *substitution*** — accessibility framed as a binary off-switch is non-compliant and vestibular-unsafe.
6. **Refresh-rate / frame-rate variability** — 60↔120Hz and jank correctness, independent of the "perf" rows which assume a stable clock.
