import { AppBar as GAppBar, Scaffold as GScaffold } from "#fuse/material_ui";
import { toHex, type ColorInput } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";

export interface ScaffoldProps {
  appBar?: JSX.Element;
  floatingActionButton?: JSX.Element;
  bottomNavigationBar?: JSX.Element;
  drawer?: JSX.Element;
  endDrawer?: JSX.Element;
  backgroundColor?: ColorInput;
  /** Let the body run under the app bar. */
  extendBodyBehindAppBar?: boolean;
  resizeToAvoidBottomInset?: boolean;
  /** The body. */
  children?: JSX.Element;
}

/** A Material screen: app bar, body (the children), and the bars around them. */
export function Scaffold(props: ScaffoldProps) {
  return (
    <GScaffold
      appBar={props.appBar}
      floatingActionButton={props.floatingActionButton}
      bottomNavigationBar={props.bottomNavigationBar}
      drawer={props.drawer}
      endDrawer={props.endDrawer}
      backgroundColor={toHex(props.backgroundColor)}
      extendBodyBehindAppBar={props.extendBodyBehindAppBar}
      resizeToAvoidBottomInset={props.resizeToAvoidBottomInset}
      body={props.children}
    />
  );
}

export interface AppBarProps {
  title?: Label;
  /** Before the title. Default: a back button when the page can pop. */
  leading?: IconSlot;
  /** After the title: usually `IconButton`s. */
  actions?: JSX.Element | JSX.Element[];
  centerTitle?: boolean;
  backgroundColor?: ColorInput;
  foregroundColor?: ColorInput;
  elevation?: number;
  /** Below the toolbar, e.g. a tab bar. */
  bottom?: JSX.Element;
}

export function AppBar(props: AppBarProps) {
  return (
    <GAppBar
      title={label(props.title)}
      leading={icon(props.leading)}
      actions={props.actions}
      centerTitle={props.centerTitle}
      backgroundColor={toHex(props.backgroundColor)}
      foregroundColor={toHex(props.foregroundColor)}
      elevation={props.elevation}
      bottom={props.bottom}
    />
  );
}
