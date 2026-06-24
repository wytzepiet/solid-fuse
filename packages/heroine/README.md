# @solid-fuse/heroine

Spring-based hero transitions for [solid-fuse](https://github.com/wytzepiet/solid-fuse), wrapping the Flutter [`heroine`](https://pub.dev/packages/heroine) package (0.5.x).

Pair a `<Heroine>` on an origin (e.g. a list thumbnail) with one on a destination (e.g. a detail header) using the **same `tag`**, then push the destination — the origin springs into the destination, picking up your gesture velocity on a drag-to-dismiss.

## Install

```bash
bun add @solid-fuse/heroine
```

`fuse dev` / `fuse link` wires the Dart side automatically (no `pubspec` edits).

## Setup: install the controller

The flight is driven by heroine's `HeroineController`, a Flutter `NavigatorObserver`. Create one with `createHeroineController()` and pass it to your `<Navigator>`'s `observers`:

```tsx
import { Navigator } from "solid-fuse";
import { createHeroineController } from "@solid-fuse/heroine";

function App() {
  const heroine = createHeroineController();
  return <Navigator observers={[heroine]} initialPage={() => <Gallery />} />;
}
```

Without it, `<Heroine>` widgets render in place and `heroinePage` still blurs/zooms, but no thumbnail→detail flight occurs. In nested-navigation setups, install one on every navigator the routes are pushed across.

## Usage

```tsx
import { Heroine, heroinePage } from "@solid-fuse/heroine";
import { GestureDetector, Image, useNavigation } from "solid-fuse";

// origin
function Card(props: { id: string; thumb: string }) {
  const nav = useNavigation();
  return (
    <GestureDetector
      onTap={() => nav.push(heroinePage({ child: () => <Detail id={props.id} /> }))}
    >
      <Heroine tag={`item-${props.id}`}>
        <Image src={props.thumb} />
      </Heroine>
    </GestureDetector>
  );
}

// destination
function Detail(props: { id: string }) {
  return (
    <Heroine tag={`item-${props.id}`}>
      {/* the bigger version */}
    </Heroine>
  );
}
```

## `<Heroine tag={...}>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `tag` | `string` | — | Shared across origin + destination; the same tag pairs the flight. |
| `motion` | `HeroineMotion` | smooth cupertino spring | Flight spring — see [Motion](#motion). |
| `shuttle` | `HeroineShuttle` | `"fade"` | Cross-fade style during flight — see [Shuttle](#shuttle). |
| `zIndex` | `number` | `0` | Overlay stacking during flight; the destination's value wins when both set one. |
| `fit` | `HeroineFit` | — | Optional `FittedBox` fit during flight. **The child must have a bounded size** — omit for `Infinity`-sized children or you'll hit an unbounded-constraints error. |

### Motion

The `motion` prop (also on `<DragDismissable>` and `heroinePage`) is a tagged union mapped to the Flutter [`motor`](https://pub.dev/packages/motor) package. Springs (`cupertino` / `spring`) read as physical movement and absorb gesture velocity; `curved` / `linear` / `none` are there for completeness but look less natural in flight.

```tsx
// cupertino spring (default kind) — SwiftUI-style duration + bounce
<Heroine motion={{ durationMs: 450, bounce: 0.2 }} />
<Heroine motion={{ variant: "snappy" }} />            // smooth | snappy | bouncy | interactive

// raw spring physics
<Heroine motion={{ kind: "spring", mass: 1, stiffness: 500, damping: 20 }} />

// non-spring
<Heroine motion={{ kind: "curved", durationMs: 300, curve: "easeInOut" }} />
<Heroine motion={{ kind: "linear", durationMs: 300 }} />
<Heroine motion={{ kind: "material", variant: "expressiveSpatialDefault" }} />
<Heroine motion={{ kind: "none" }} />
```

For a `cupertino` `variant`, `bounce` is *extra* bounce on top of the preset; for the plain spring it's the absolute bounce (−1..1). `snapToEnd` makes the spring settle exactly on target.

### Shuttle

How the two heroes blend mid-flight. A bare string uses defaults; the object form exposes each builder's parameters.

```tsx
<Heroine shuttle="fade" />          // default cross-fade
<Heroine shuttle="single" />        // show only the destination (classic Hero look)
<Heroine shuttle={{ type: "single", useFromHero: true }} />
<Heroine shuttle={{ type: "flip", axis: "horizontal", halfFlips: 1 }} />
<Heroine shuttle={{ type: "fadeThrough", fadeColor: Color.black }} />
<Heroine shuttle={{ type: "chained", builders: ["flip", "fade"] }} />
```

## `<DragDismissable>`

Lets its child be dragged to dismiss. Wrapping a `<Heroine>` feeds the release velocity into the flight spring, so the hero flies away with momentum.

```tsx
<DragDismissable axisAffinity="vertical">
  <Heroine tag="photo"><Image src={url} /></Heroine>
</DragDismissable>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `threshold` | `number` | `140` | Drag distance (px) past which release dismisses. |
| `velocityThreshold` | `number` | `1000` | Release velocity (px/s) that dismisses regardless of distance. |
| `axisAffinity` | `"horizontal" \| "vertical"` | both | Restrict the drag to one axis (avoids fighting scrollables). |
| `constrainToAxis` | `boolean` | `true` | With an `axisAffinity`, also clamp visible movement to it. |
| `motion` | `HeroineMotion` | interactive cupertino | Snap-back spring when not dismissed. |
| `onDismiss` | `() => void` | — | If set, the route is **not** auto-popped — you decide what dismiss means. Omit to pop the current route (respecting its `popDisposition`). |

## `heroinePage({ child, ... })`

A page transition that blurs + zooms the page behind while the new page springs in from `inZoom` to full size. Being a `HeroinePageRoute`, it also drives `<Heroine>` flights and `<DragDismissable>` within it.

| Option | Type | Default | Description |
|---|---|---|---|
| `child` | `() => JSX.Element` | — | Page contents (thunk). |
| `name` | `string` | — | Route name (for `popUntil`). |
| `inZoom` | `number` | `0.8` | Entry scale of the incoming page. |
| `outZoom` | `number` | `0.9` | Scale the outgoing page shrinks to. |
| `backgroundColor` | `Color` | black | Backdrop revealed behind; dims as you drag to dismiss. |
| `motion` | `HeroineMotion` | cupertino 400ms / 0.2 | Spring driving the blur/zoom. |
| `transitionDurationMs` | `number` | `400` | Transition duration. |

## Not wrapped

A few heroine pieces are intentionally not exposed:

- **`HeroineMode`** (enable/disable flights in a subtree) — not part of heroine 0.5.x's public exports.
- **`ReactToHeroineDismiss`** — a Dart builder that rebuilds with per-frame dismiss `progress`/`offset`. It's used internally by `heroinePage` (to dim the backdrop), but exposing it to JSX would mean a per-frame value bridge, which doesn't fit the declarative model cleanly.
- **`HeroineVelocity`** / **`placeholderBuilder`** — internal plumbing (`<DragDismissable>` manages velocity for you).
