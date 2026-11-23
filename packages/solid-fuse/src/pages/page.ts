import { createContext, getOwner, useContext } from "solid-js";
import type { PageConfig } from "../navigation-controller";

export type PageProps = {
  child: () => JSX.Element;
  /** Names the page for `nav.popUntil(name)`. */
  name?: string;
  /** How the page comes in. Default `"slide"`. */
  transition?: "slide" | "fade" | "none";
  /** Transition length in ms. Default 300. */
  duration?: number;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
  /** False lets the page below show through. Default true. */
  opaque?: boolean;
};

/** Core's page: no design, the content brings its own background. */
export function page({ child, ...props }: PageProps): PageConfig<Omit<PageProps, "child">> {
  return { type: "page", child, props };
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
