import type { BaseProps } from "../types";

export interface SliverReorderableListProps extends BaseProps {
  /**
   * Called when a child is dropped in a new position. The list is *not*
   * reordered automatically — update your data so the children reflect the
   * new order (e.g. splice the moved item from `oldIndex` to `newIndex`).
   */
  onReorder: (oldIndex: number, newIndex: number) => void;
  /** Called when an item starts being dragged, with its index. */
  onReorderStart?: (index: number) => void;
  /** Called when a drag gesture ends, with the item's index. */
  onReorderEnd?: (index: number) => void;
  /** Fixed main-axis extent for every item (enables faster layout). */
  itemExtent?: number;
  /** A prototype child whose main-axis extent sizes every item. */
  prototypeItem?: any;
}

export function SliverReorderableList(props: SliverReorderableListProps) {
  // Flutter pushes a single value per callback; unpack it into the positional
  // signatures the public API exposes.
  return (
    <sliverReorderableList
      {...props}
      onReorder={(e: { oldIndex: number; newIndex: number }) =>
        props.onReorder(e.oldIndex, e.newIndex)
      }
      onReorderStart={
        props.onReorderStart && ((i: number) => props.onReorderStart!(i))
      }
      onReorderEnd={
        props.onReorderEnd && ((i: number) => props.onReorderEnd!(i))
      }
    />
  );
}
