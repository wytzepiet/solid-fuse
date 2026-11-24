import { transitionProp, type PageConfig, type Transition } from "solid-fuse";

export type HeroinePageProps = {
  child: () => JSX.Element;
  /** Names the page: Flutter's `Page.name`. */
  name?: string;
  /** Transition length in ms. Default 300. */
  duration?: number;
  reverseDuration?: number;
  /** Your own, instead of the fade. The heroines fly either way. */
  transition?: Transition;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
};

/**
 * A see-through page that fades in while its heroines fly. A
 * `DragDismissable` in it drags it away; `ReactToHeroineDismiss` follows
 * the drag.
 */
export function heroinePage({ child, transition, ...props }: HeroinePageProps): PageConfig<Omit<HeroinePageProps, "child">> {
  return { type: "heroinePage", child, props: { ...props, transition: transition && transitionProp(transition) } as any };
}
