export interface TooltipProps {
  /** What shows. Design packages' tooltips wrap this in their look. */
  content: JSX.Element;
  /** Read by screen readers instead of the content. */
  label?: string;
  /** Default `"longPress"` (and hover with a mouse). */
  trigger?: "longPress" | "tap" | "manual";
  hoverDelay?: number;
  touchDelay?: number;
  dismissDelay?: number;
  onShow?: () => void;
  children?: JSX.Element;
}

/** Shows `content` near the children on hover or long press. */
export function Tooltip(props: TooltipProps) {
  return <tooltip {...props} />;
}
