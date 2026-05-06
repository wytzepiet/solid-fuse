import type { PageConfig } from "../navigator";

export type MaterialPageProps = {
  child: () => JSX.Element;
  name?: string;
  fullscreenDialog?: boolean;
  maintainState?: boolean;
};

/** Config for a Material-style page. Pass to `nav.push(...)`. */
export function materialPage({
  child,
  ...props
}: MaterialPageProps): PageConfig<Omit<MaterialPageProps, "child">> {
  return { type: "materialPage", child, props };
}
