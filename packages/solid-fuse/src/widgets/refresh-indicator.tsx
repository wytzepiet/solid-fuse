import type { BaseProps, Color } from "../types";

export interface RefreshIndicatorProps extends BaseProps {
  onRefresh?: () => Promise<void>;
  triggerMode?: "onEdge" | "anywhere";
  color?: Color;
  backgroundColor?: Color;
  displacement?: number;
  edgeOffset?: number;
  strokeWidth?: number;
  // Use the platform-adaptive indicator (CupertinoActivityIndicator on iOS/macOS).
  adaptive?: boolean;
}

export function RefreshIndicator(props: RefreshIndicatorProps) {
  return <refreshIndicator {...props} />;
}
