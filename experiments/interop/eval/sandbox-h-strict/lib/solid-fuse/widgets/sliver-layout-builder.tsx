import { createSignal } from "solid-js";
import type { BaseProps } from "../types";

/** Snapshot of the sliver constraints pushed from Flutter on each build. */
export interface SliverConstraintsSnapshot {
  crossAxisExtent: number;
  scrollOffset: number;
  remainingPaintExtent: number;
  viewportMainAxisExtent: number;
  precedingScrollExtent: number;
  overlap: number;
  axisDirection: "up" | "down" | "left" | "right";
  growthDirection: "forward" | "reverse";
  userScrollDirection: "idle" | "forward" | "reverse";
}

const initialConstraints: SliverConstraintsSnapshot = {
  crossAxisExtent: 0,
  scrollOffset: 0,
  remainingPaintExtent: 0,
  viewportMainAxisExtent: 0,
  precedingScrollExtent: 0,
  overlap: 0,
  axisDirection: "down",
  growthDirection: "forward",
  userScrollDirection: "idle",
};

export interface SliverLayoutBuilderProps extends Omit<BaseProps, "children"> {
  /** Builder invoked with the live sliver constraints; must return a sliver. */
  children: (constraints: SliverConstraintsSnapshot) => any;
}

export function SliverLayoutBuilder(props: SliverLayoutBuilderProps) {
  const [constraints, setConstraints] =
    createSignal<SliverConstraintsSnapshot>(initialConstraints);

  return (
    <sliverLayoutBuilder ref={props.ref} onConstraints={setConstraints}>
      {() => props.children(constraints())}
    </sliverLayoutBuilder>
  );
}
