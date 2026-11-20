import type { BaseProps } from "../types";

export interface ReorderableDelayedDragStartListenerProps extends BaseProps {
  /** The index of the item this listener drags within its SliverReorderableList. */
  index: number;
  /** Whether the listener is enabled (defaults to true). */
  enabled?: boolean;
}

// Like ReorderableDragStartListener, but starts the drag after a long press.
export function ReorderableDelayedDragStartListener(
  props: ReorderableDelayedDragStartListenerProps,
) {
  return <reorderableDelayedDragStartListener {...props} />;
}
