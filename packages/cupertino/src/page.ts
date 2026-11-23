import type { PageConfig } from "solid-fuse";

export type CupertinoPageProps = {
  child: () => JSX.Element;
  name?: string;
  /** The next page's back button shows it. */
  title?: string;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
};

/** An iOS page: slides in from the right, swipe back from the edge. */
export function cupertinoPage({ child, ...props }: CupertinoPageProps): PageConfig<Omit<CupertinoPageProps, "child">> {
  return { type: "cupertinoPage", child, props };
}
