import { For, untrack } from "solid-js";
import { Dynamic } from "./dynamic";
import { PageContext, createStack, pageConfigOf, usePage, type PageEntry } from "./navigation";
import { usePageType } from "./pages/page";

export {
  createStack,
  openAppLink,
  saveNavigation,
  useNav,
  usePage,
  type MountedStack,
  type Nav,
  type Page,
  type PageConfig,
  type PageEntry,
  type PushOptions,
  type SavedEntry,
  type SavedHolder,
  type Stack as StackHandle,
} from "./navigation";

const wrap = (e: PageEntry, child: () => JSX.Element) => <PageContext value={e as any}>{child()}</PageContext>;

/**
 * A Flutter Navigator drawing one of the page's stacks (the app's,
 * outside any page). `index` is its first page's address; without it, the
 * page's own address (the folder's `index.tsx`). `observers` are Flutter's
 * NavigatorObservers: generated handles, such as a package's hero controller.
 */
export function Navigator(props: { index?: string; observers?: import("./types").NavigatorObserversInput }): JSX.Element {
  const stack = createStack({ index: untrack(() => props.index) });
  const asPage = usePageType();
  return (
    <navigator
      observers={props.observers}
      takesBack={stack.takesBack()}
      onDidRemovePage={(e: { id: number }) => stack.removed(e.id)}
    >
      <For each={stack.entries()} keyed={(e) => e.id}>
        {(entry) => {
          const config = pageConfigOf(entry(), asPage, wrap);
          return (
            <Dynamic component={config.type} _pageId={entry().id} {...config.props}>
              {config.child()}
            </Dynamic>
          );
        }}
      </For>
    </navigator>
  );
}

/**
 * Shows one of the page's stacks and keeps the rest alive: hidden ones
 * don't tick or take back. Its children are the `<Navigator>`s, in tab order.
 * Back on another tab's first page goes to the first tab. A small helper
 * over `usePage()`: write your own for a pager or a rail.
 */
export function Tabs(props: { children?: JSX.Element }): JSX.Element {
  const page = usePage();
  const index = () => Math.max(0, page.stacks().indexOf(page.active() ?? ""));
  return (
    <tabs
      index={index()}
      backToFirst={index() > 0 && page.stack(page.active()).pages().length <= 1}
      onBack={() => page.show(page.stacks()[0]!)}
    >
      {props.children}
    </tabs>
  );
}
