export interface MenuProps {
  open: boolean;
  /** Called with false on a tap outside, Escape, or scroll. */
  onOpenChange?: (open: boolean) => void;
  /** What shows below the anchor (above when there is no room). */
  content: JSX.Element;
  /** Line up with the anchor's start (default) or end edge. */
  align?: "start" | "end";
  /** Gap below the anchor. Default 4. */
  offset?: number;
  /** A tap outside only closes the menu, it doesn't reach what's under it. Default true. */
  consumeOutsideTaps?: boolean;
  /** The anchor. */
  children?: JSX.Element;
}

/** A popup anchored to its children: dropdowns, context menus, pickers. */
export function Menu(props: MenuProps) {
  return <menu {...props} />;
}
