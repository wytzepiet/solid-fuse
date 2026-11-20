import type { BaseProps, ColorInput } from "../types";

export interface RefreshIndicatorProps extends BaseProps {
  onRefresh?: () => Promise<void>;
  triggerMode?: "onEdge" | "anywhere";
  color?: ColorInput;
  backgroundColor?: ColorInput;
  displacement?: number;
  edgeOffset?: number;
  strokeWidth?: number;
  // Use the platform-adaptive indicator (CupertinoActivityIndicator on iOS/macOS).
  adaptive?: boolean;
}

export function RefreshIndicator(props: RefreshIndicatorProps) {
  return <refreshIndicator {...props} />;
}
