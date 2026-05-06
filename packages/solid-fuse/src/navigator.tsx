import { For, untrack } from "solid-js";
import { Dynamic } from "./dynamic";
import {
  NavigationContext,
  createNavigationController,
  type NavigationController,
} from "./navigation-controller";
import type { PageConfig } from "./navigation-controller";

export {
  createNavigationController,
  useNavigation,
  type NavigationController,
  type PageConfig,
  type PageEntry,
} from "./navigation-controller";

/**
 * Mounts a Flutter Navigator and drives its pages list from a
 * `NavigationController`. Either accepts a pre-built `controller` (useful
 * for sub-navigators whose state is owned outside the wrapper — e.g. a
 * tab that resets to home from a parent), or builds its own from
 * `initialPage`.
 *
 * The `controller` prop is read once at mount; reactive swaps are ignored.
 */
export function Navigator(props: {
  controller?: NavigationController;
  initialPage?: (() => JSX.Element) | PageConfig;
}): JSX.Element {
  const nav = untrack(
    () =>
      props.controller ??
      createNavigationController({ initialPage: props.initialPage }),
  );

  return (
    <NavigationContext value={nav}>
      <navigator
        onDidRemovePage={(e: { id: number }) => nav.onDidRemovePage(e.id)}
      >
        <For each={nav.pages()}>
          {(entry) => {
            const e = entry();
            return (
              <Dynamic component={e.config.type} _pageId={e.id} {...e.config.props}>
                {e.config.child()}
              </Dynamic>
            );
          }}
        </For>
      </navigator>
    </NavigationContext>
  );
}
