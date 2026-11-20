import type { BaseProps } from "../types";

export interface ReorderableDragStartListenerProps extends BaseProps {
  /** The index of the item this listener drags within its SliverReorderableList. */
  index: number;
  /** Whether the listener is enabled (defaults to true). */
  enabled?: boolean;
}

// Wrap (part of) a reorderable item to start a drag immediately on touch-down.
export function ReorderableDragStartListener(
  props: ReorderableDragStartListenerProps,
) {
  return <reorderableDragStartListener {...props} />;
}
