import type { BaseProps } from "../types";

export interface CupertinoSliverRefreshControlProps extends BaseProps {
  onRefresh?: () => Promise<void>;
  refreshTriggerPullDistance?: number;
  refreshIndicatorExtent?: number;
}

export function CupertinoSliverRefreshControl(
  props: CupertinoSliverRefreshControlProps,
) {
  return <cupertinoSliverRefreshControl {...props} />;
}
