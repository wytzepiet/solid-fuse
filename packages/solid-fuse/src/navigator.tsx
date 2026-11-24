import { For, untrack } from "solid-js";
import { Dynamic } from "./dynamic";
import {
  NavigationContext,
  _setLayoutRenderer,
  _setTabsRenderer,
  createNavigationController,
  type NavigationController,
} from "./navigation-controller";
import type { PageConfig } from "./navigation-controller";
import type { Route } from "./routes";

export {
  createNavigationController,
  openAppLink,
  useNavigation,
  type NavigationController,
  type PageConfig,
  type PageEntry,
  type PushOptions,
  type SavedStack,
  type SavedEntry,
  type TabsState,
  useTabs,
} from "./navigation-controller";

/**
 * Mounts a Flutter Navigator and drives its pages list from a
 * `NavigationController`. Either accepts a pre-built `controller` (useful
 * for sub-navigators whose state is owned outside the wrapper — e.g. a
 * tab that resets to home from a parent), or builds its own from
 * `initialPage`: a route, a page, or a component thunk.
 *
 * The `controller` prop is read once at mount; reactive swaps are ignored.
 * `observers` are Flutter's NavigatorObservers: generated handles, such as
 * a package's hero controller.
 */
export function Navigator(props: {
  controller?: NavigationController;
  initialPage?: Route | (() => JSX.Element) | PageConfig;
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

// A layout route's component gets its own navigator as `children`.
_setLayoutRenderer((controller) => <Navigator controller={controller} />);

// A tabs layout's `children`: every tab's navigator, kept alive; only the
// visible one ticks and takes back. Back on another tab's first page goes
// to the first tab.
_setTabsRenderer((tabs) => (
  <tabs
    index={tabs.index()}
    backToFirst={tabs.index() !== 0 && tabs.navigators[tabs.index()]!.stackDepth() <= 1}
    onBack={() => tabs.select(0)}
  >
    {tabs.navigators.map((controller) => (
      <Navigator controller={controller} />
    ))}
  </tabs>
));
