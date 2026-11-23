import type { PageConfig } from "solid-fuse";

export type HeroinePageProps = {
  child: () => JSX.Element;
  /** Names the page for `nav.popUntil(name)`. */
  name?: string;
  /** Fade length in ms. Default 300. */
  duration?: number;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
};

/**
 * A see-through page that fades in while its heroines fly. A
 * `DragDismissable` in it drags it away; `ReactToHeroineDismiss` follows
 * the drag.
 */
export function heroinePage({ child, ...props }: HeroinePageProps): PageConfig<Omit<HeroinePageProps, "child">> {
  return { type: "heroinePage", child, props };
}
