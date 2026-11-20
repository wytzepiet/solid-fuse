import { createSignal } from "solid-js";
import type { BaseProps } from "../types";

export interface NestedScrollViewProps extends Omit<BaseProps, "children"> {
  scrollDirection?: "vertical" | "horizontal";
  reverse?: boolean;
  controller?: import("../scroll-controller").ScrollController;
  /** Lets the header slivers float into view on a reverse scroll. */
  floatHeaderSlivers?: boolean;
  /**
   * Builder for the outer header slivers. Invoked with the live
   * `innerBoxIsScrolled` flag pushed from Flutter on each header build. Must
   * return slivers (e.g. a `<SliverAppBar>` plus a `<SliverOverlapAbsorber>`).
   */
  header: (innerBoxIsScrolled: boolean) => any;
  /** The inner scrollable body (typically a `<CustomScrollView>`). */
  body: any;
}

export function NestedScrollView(props: NestedScrollViewProps) {
  const [innerBoxIsScrolled, setInnerBoxIsScrolled] = createSignal(false);

  // The header slivers are rendered as the direct children of <nestedScrollView>
  // (a reactive function child, the same pattern as <SliverPersistentHeader>).
  // The Dart `headerSliverBuilder` returns this node's childWidgets, so a change
  // to the *number* of header slivers marks the node dirty and refreshes the
  // header without waiting for a scroll. `onHeader` feeds the live
  // `innerBoxIsScrolled` flag back into the builder.
  return (
    <nestedScrollView
      scrollDirection={props.scrollDirection}
      reverse={props.reverse}
      controller={props.controller}
      floatHeaderSlivers={props.floatHeaderSlivers}
      body={props.body}
      ref={props.ref}
      onHeader={setInnerBoxIsScrolled}
    >
      {() => props.header(innerBoxIsScrolled())}
    </nestedScrollView>
  );
}
