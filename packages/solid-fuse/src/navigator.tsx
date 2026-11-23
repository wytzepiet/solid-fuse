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
 * `observers` are Flutter's NavigatorObservers: generated handles, such as
 * a package's hero controller.
 */
export function Navigator(props: {
  controller?: NavigationController;
  initialPage?: (() => JSX.Element) | PageConfig;
  observers?: import("./types").NavigatorObserversInput;
}): JSX.Element {
  const nav = untrack(
    () =>
      props.controller ??
      createNavigationController({ initialPage: props.initialPage }),
  );

  return (
    <NavigationContext value={nav}>
      <navigator
        observers={props.observers}
        onDidRemovePage={(e: { id: number }) => nav.onDidRemovePage(e.id)}
      >
        <For each={nav.pages()} keyed={(e) => e.id}>
          {(entry) => (
            <Dynamic
              component={entry().config.type}
              _pageId={entry().id}
              {...entry().config.props}
            >
              {entry().config.child()}
            </Dynamic>
          )}
        </For>
      </navigator>
    </NavigationContext>
  );
}
