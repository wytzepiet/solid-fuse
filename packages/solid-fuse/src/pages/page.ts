import { createContext, getOwner, useContext } from "solid-js";
import type { PageConfig } from "../navigation-controller";
import { createElement } from "../renderer";
import type { Color } from "../flutter";
import type { Animation } from "../types";

/** A route's animations: `animation` runs as it comes and goes, `secondaryAnimation` as the next page covers it. */
export type RouteAnimations = { animation: Animation; secondaryAnimation: Animation };

/**
 * A transition written in JS: wrap `page` in Flutter's transition widgets,
 * driven by the route's animations. It runs once per route; the widgets
 * follow the animations in Dart.
 *
 * ```tsx
 * transition: (page, { animation }) => <FadeTransition opacity={animation}>{page}</FadeTransition>
 * ```
 */
export type Transition = (page: JSX.Element, animations: RouteAnimations) => JSX.Element;

/**
 * A page type's `transition` prop as it crosses to Dart: Dart calls it with
 * the route's animations, and `<routeChild>` stands for the page.
 */
export function transitionProp(t: Transition): (animation: Animation, secondaryAnimation: Animation) => JSX.Element {
  return (animation, secondaryAnimation) =>
    t(createElement("routeChild") as unknown as JSX.Element, { animation, secondaryAnimation });
}

export type PageProps = {
  child: () => JSX.Element;
  /** Names the page for `nav.popUntil(name)`. */
  name?: string;
  /** How the page comes in: `"slide"` (default), `"fade"`, `"none"`, or your own. */
  transition?: "slide" | "fade" | "none" | Transition;
  /** Transition length in ms. Default 300. */
  duration?: number;
  /** Length going out, in ms. Default: `duration`. */
  reverseDuration?: number;
  /** Covers the page below while this one is up (with `opaque: false`). */
  barrierColor?: Color;
  /** A tap on the barrier pops the page. */
  barrierDismissible?: boolean;
  barrierLabel?: string;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
  /** False lets the page below show through. Default true. */
  opaque?: boolean;
};

/** Core's page: no design, the content brings its own background. */
export function page({ child, transition, ...props }: PageProps): PageConfig<Omit<PageProps, "child">> {
  return {
    type: "page",
    child,
    props: { ...props, transition: typeof transition === "function" ? transitionProp(transition) : transition } as Omit<PageProps, "child">,
  };
}

/** Turns a bare component into a page; `nav.push(() => ...)` uses it. */
export type PageFactory = (child: () => JSX.Element) => PageConfig;

/**
 * The page type a bare `() => JSX` becomes. App roots set it: `<App>` gives
 * `page`, a Material app `materialPage`, a Cupertino app `cupertinoPage`.
 */
export const PageTypeContext = createContext<PageFactory>((child) => page({ child }));

export function usePageType(): PageFactory {
  return getOwner() ? useContext(PageTypeContext) : (child) => page({ child });
}
