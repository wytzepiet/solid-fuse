import { getOwner, onCleanup } from "solid-js";
import {
  NavigatorObserverHandle,
  type Color,
  type PageConfig,
  type ScrollController,
} from "solid-fuse";

// ─── Motion ──────────────────────────────────────────────────────────────────

/** Easing curve name (maps to a Flutter `Curve`). */
export type Curve =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInOutCubic"
  | "fastOutSlowIn"
  | "decelerate"
  | "bounceIn"
  | "bounceOut"
  | "bounceInOut"
  | "elasticIn"
  | "elasticOut"
  | "elasticInOut";

/** Cupertino spring presets (SwiftUI-style). */
export type CupertinoMotionVariant =
  | "smooth"
  | "snappy"
  | "bouncy"
  | "interactive";

/** Material 3 spring presets — `spatial` tokens suit movement (hero flights),
 *  `effects` tokens suit opacity/color. */
export type MaterialMotionVariant =
  | "standardSpatialFast"
  | "standardSpatialDefault"
  | "standardSpatialSlow"
  | "standardEffectsFast"
  | "standardEffectsDefault"
  | "standardEffectsSlow"
  | "expressiveSpatialFast"
  | "expressiveSpatialDefault"
  | "expressiveSpatialSlow"
  | "expressiveEffectsFast"
  | "expressiveEffectsDefault"
  | "expressiveEffectsSlow";

/**
 * How a heroine moves. A heroine-owned shape mapped to the Flutter `motor`
 * package's `Motion` on the Dart side (so this API is insulated from motor's
 * own class layout).
 *
 * For hero flights, prefer a spring (`cupertino` / `spring`) — they read as
 * physical movement and pick up gesture velocity. `curved` / `linear` / `none`
 * are available for completeness but look less natural in flight.
 */
export type HeroineMotion =
  | {
      kind?: "cupertino";
      /** Preset. Omit for the plain spring (duration 550ms, no bounce). */
      variant?: CupertinoMotionVariant;
      durationMs?: number;
      /** Bounce −1..1. With a `variant`, this is *extra* bounce on top of it. */
      bounce?: number;
      /** Settle exactly to target when the spring is nearly done. */
      snapToEnd?: boolean;
    }
  | {
      kind: "spring";
      mass?: number;
      stiffness?: number;
      damping?: number;
      snapToEnd?: boolean;
    }
  | { kind: "curved"; durationMs?: number; curve?: Curve }
  | { kind: "linear"; durationMs?: number }
  | { kind: "material"; variant?: MaterialMotionVariant }
  | { kind: "none" };

// ─── Shuttle (cross-fade style during flight) ─────────────────────────────────

/**
 * How the from-hero and to-hero are blended mid-flight. A bare string is the
 * preset with defaults; the object form exposes each builder's parameters.
 */
export type HeroineShuttle =
  | "fade"
  | "flip"
  | "single"
  | "fadeThrough"
  | { type: "fade"; curve?: Curve }
  /** Show only one hero for the whole flight (Flutter's default Hero look). */
  | { type: "single"; useFromHero?: boolean }
  | {
      type: "flip";
      axis?: "horizontal" | "vertical";
      flipForward?: boolean;
      invertFlipOnReturn?: boolean;
      /** Number of 180° flips. 1 = half turn, 2 = full turn, … */
      halfFlips?: number;
      curve?: Curve;
    }
  | { type: "fadeThrough"; fadeColor?: Color; curve?: Curve }
  /** Compose builders — applied outermost-first. */
  | { type: "chained"; builders: HeroineShuttle[] };

// ─── Heroine ───────────────────────────────────────────────────────────────

/** How the child is fitted while flying (maps to Flutter `BoxFit`). */
export type HeroineFit =
  | "cover"
  | "contain"
  | "fill"
  | "fitWidth"
  | "fitHeight"
  | "none"
  | "scaleDown";

export interface HeroineProps {
  /**
   * Identifier shared by the origin and destination heroine. The SAME tag on
   * two routes pairs them into a flight when one is pushed over the other.
   */
  tag: string;
  /** Optional `FittedBox` fit during the flight. The child must have a bounded
   *  size — omit for unbounded children or you'll hit a constraints error. */
  fit?: HeroineFit;
  /** Flight spring. Defaults to a smooth cupertino spring (no bounce). */
  motion?: HeroineMotion;
  /** Cross-fade style during the flight. Defaults to `"fade"`. */
  shuttle?: HeroineShuttle;
  /** Overlay stacking during flight — higher flies above lower. Defaults to 0;
   *  the destination's z-index wins when both set one. */
  zIndex?: number;
  children?: JSX.Element;
}

/**
 * A spring-based Hero. Wrap the origin (e.g. a list thumbnail) and the
 * destination (e.g. a detail header) in `<Heroine>` with the same `tag`, and
 * pushing the destination animates one into the other.
 *
 * Requires a `HeroineController` installed on the Navigator —
 * `<Navigator observers={[createHeroineController()]}>`. Without it the
 * heroines render in place with no flight.
 */
export function Heroine(props: HeroineProps) {
  return <heroine {...props} />;
}

// ─── DragDismissable ─────────────────────────────────────────────────────────

export interface DragDismissableProps {
  /** Drag distance (px) past which release dismisses. Default 140. */
  threshold?: number;
  /** Release velocity (px/s) past which it dismisses regardless of distance.
   *  Default 1000. */
  velocityThreshold?: number;
  /** Restrict the drag to one axis. Omit to allow both. */
  axisAffinity?: "horizontal" | "vertical";
  /** When an `axisAffinity` is set, also clamp visible movement to it.
   *  Default true. */
  constrainToAxis?: boolean;
  /** Spring used to snap back when not dismissed. Defaults to an interactive
   *  cupertino spring. */
  motion?: HeroineMotion;
  /**
   * Cooperate with a scrollable child. Pass the same controller as the child
   * `<ScrollView>`/`<CustomScrollView>`: a dismiss drag then only begins when
   * the list is scrolled to the top and the gesture pulls *down*, so a downward
   * swipe at the top dismisses while normal scrolling is untouched. (Vertical,
   * downward; ignores `axisAffinity`/`constrainToAxis`.)
   */
  scrollController?: ScrollController;
  /**
   * Called when dismissed. If provided, the route is NOT auto-popped (you
   * decide what dismiss means). Omit to pop the current route, respecting its
   * `popDisposition`.
   */
  onDismiss?: () => void;
  children?: JSX.Element;
}

/**
 * Lets its child be dragged to dismiss. Wrapping a `<Heroine>` also feeds the
 * gesture velocity into the flight spring, so the hero flies away with momentum.
 */
export function DragDismissable(props: DragDismissableProps) {
  return <dragDismissable {...props} />;
}

// ─── HeroineController ───────────────────────────────────────────────────────

/**
 * The navigator observer that drives `<Heroine>` flights. Install it on the
 * Navigator: `<Navigator observers={[createHeroineController()]}>`.
 *
 * In some nested-navigation setups you need one on every navigator the routes
 * are pushed across.
 */
export class HeroineController extends NavigatorObserverHandle<"heroineController"> {
  constructor() {
    super("heroineController");
  }
}

/**
 * Create a {@link HeroineController}. Inside a reactive owner it auto-disposes
 * on cleanup; otherwise (or with `new HeroineController()`) call `dispose()`.
 */
export function createHeroineController(): HeroineController {
  const controller = new HeroineController();
  if (getOwner()) onCleanup(() => controller.dispose());
  return controller;
}

// ─── heroinePage ─────────────────────────────────────────────────────────────

export interface HeroinePageOptions {
  /** Page contents (a thunk — not built until the page mounts). */
  child: () => JSX.Element;
  /** Route name (for `popUntil`). */
  name?: string;
  /** Entry scale of the incoming page (0..1). Default 0.8. */
  inZoom?: number;
  /** Scale the outgoing page shrinks to as it's pushed away. Default 0.9. */
  outZoom?: number;
  /** Backdrop color revealed behind the page; dims as you drag to dismiss. */
  backgroundColor?: Color;
  /** Spring driving the blur/zoom transition. Defaults to a cupertino spring. */
  motion?: HeroineMotion;
  /** Transition duration in ms. Default 400. */
  transitionDurationMs?: number;
}

/**
 * A page transition that blurs + zooms the page behind while the new page
 * springs in from `inZoom` to full size — and, being a HeroinePageRoute,
 * drives any `<Heroine>` flights and `<DragDismissable>` within it.
 *
 * `nav.push(heroinePage({ child: () => <DetailPage /> }))`
 */
export function heroinePage(opts: HeroinePageOptions): PageConfig {
  const { child, ...props } = opts;
  return { type: "heroinePage", child, props };
}
