import type { PageConfig } from "solid-fuse";

export type MaterialPageProps = {
  child: () => JSX.Element;
  name?: string;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
};

/** A Material page: the platform's Material transition, on a Material surface. */
export function materialPage({ child, ...props }: MaterialPageProps): PageConfig<Omit<MaterialPageProps, "child">> {
  return { type: "materialPage", child, props };
}
