import type { BaseProps } from "../types";

export interface SliverOverlapInjectorProps extends Omit<BaseProps, "children"> {}

/**
 * Injects the overlap absorbed by a `<SliverOverlapAbsorber>` back into the
 * inner scrollable of a `<NestedScrollView>`, so the first inner sliver clears
 * the pinned header. Usually placed first in the inner `<CustomScrollView>`.
 * The shared handle is resolved Dart-side — never threaded through JS.
 */
export function SliverOverlapInjector(props: SliverOverlapInjectorProps) {
  return <sliverOverlapInjector {...props} />;
}
