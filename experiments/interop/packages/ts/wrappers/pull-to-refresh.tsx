// Thin TS wrapper over pull_to_refresh.SmartRefresher (widget generator) + RefreshController (object generator).
// It hides the imperative controller protocol: the app returns a promise, the wrapper calls
// refreshCompleted / refreshFailed / loadComplete / loadNoData. 1 native widget node + 1 handle node (the
// controller, created once) + 1 node for the header slot. Per render: 2 props remapped; per gesture: 1 RPC.
import { SmartRefresher, WaterDropHeader } from "~/_generated/pull_to_refresh";
import { createRefreshController } from "~/modules/pull_to_refresh";
import type { FuseChildren, FuseElement } from "solid-fuse";

export interface PullToRefreshProps {
  children?: FuseChildren;
  onRefresh?: () => Promise<unknown>;
  /** Resolve to `false` when there is no more data. */
  onLoadMore?: () => Promise<boolean | void>;
  header?: FuseElement;
}

export function PullToRefresh(props: PullToRefreshProps) {
  const controller = createRefreshController({ initialRefresh: false });
  return (
    <SmartRefresher
      controller={controller}
      enablePullDown={!!props.onRefresh}
      enablePullUp={!!props.onLoadMore}
      header={props.header ?? <WaterDropHeader />}
      onRefresh={() => props.onRefresh?.().then(() => controller.refreshCompleted(), () => controller.refreshFailed())}
      onLoading={() =>
        props.onLoadMore?.().then(
          (more) => (more === false ? controller.loadNoData() : controller.loadComplete()),
          () => controller.loadFailed(),
        )
      }
    >
      {props.children}
    </SmartRefresher>
  );
}
