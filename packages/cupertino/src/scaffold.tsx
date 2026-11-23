import { CupertinoNavigationBar, CupertinoNavigationBarLarge, CupertinoPageScaffold } from "#fuse/cupertino_ui";
import { Dynamic, toHex, type ColorInput } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";

export interface PageScaffoldProps {
  navigationBar?: JSX.Element;
  backgroundColor?: ColorInput;
  resizeToAvoidBottomInset?: boolean;
  /** The page's content. */
  children?: JSX.Element;
}

/** An iOS screen: a navigation bar over the content. */
export function PageScaffold(props: PageScaffoldProps) {
  return (
    <CupertinoPageScaffold
      navigationBar={props.navigationBar}
      backgroundColor={toHex(props.backgroundColor)}
      resizeToAvoidBottomInset={props.resizeToAvoidBottomInset}
    >
      {props.children}
    </CupertinoPageScaffold>
  );
}

export interface NavigationBarProps {
  title?: Label;
  /** A big title that sits under the bar (iOS 11 style). */
  large?: boolean;
  /** Default: a back button when the page can pop. */
  leading?: IconSlot;
  trailing?: IconSlot;
  /** The back button's label. Default: the previous `cupertinoPage`'s title. */
  previousPageTitle?: string;
  backgroundColor?: ColorInput;
}

export function NavigationBar(props: NavigationBarProps) {
  return (
    <Dynamic
      component={props.large ? CupertinoNavigationBarLarge : CupertinoNavigationBar}
      largeTitle={props.large ? label(props.title) : undefined}
      middle={props.large ? undefined : label(props.title)}
      leading={icon(props.leading)}
      trailing={icon(props.trailing)}
      previousPageTitle={props.previousPageTitle}
      backgroundColor={toHex(props.backgroundColor)}
    />
  );
}
