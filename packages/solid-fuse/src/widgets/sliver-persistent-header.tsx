import { createSignal } from "solid-js";
import type { BaseProps } from "../types";

/** Layout snapshot pushed from Flutter on every header delegate build. */
export interface PersistentHeaderLayout {
  shrinkOffset: number;
  overlapsContent: boolean;
}

export interface SliverPersistentHeaderProps extends Omit<BaseProps, "children"> {
  pinned?: boolean;
  floating?: boolean;
  minExtent?: number;
  maxExtent?: number;
  /** Builder invoked with the live shrink offset + overlap each frame. */
  children: (shrinkOffset: number, overlapsContent: boolean) => any;
}

export function SliverPersistentHeader(props: SliverPersistentHeaderProps) {
  const [layout, setLayout] = createSignal<PersistentHeaderLayout>({
    shrinkOffset: 0,
    overlapsContent: false,
  });

  return (
    <sliverPersistentHeader
      pinned={props.pinned}
      floating={props.floating}
      minExtent={props.minExtent}
      maxExtent={props.maxExtent}
      ref={props.ref}
      onLayout={setLayout}
    >
      {() => props.children(layout().shrinkOffset, layout().overlapsContent)}
    </sliverPersistentHeader>
  );
}
