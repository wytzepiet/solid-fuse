import type { BaseProps } from "../types";

export interface SliverOverlapAbsorberProps extends BaseProps {}

/**
 * Absorbs the overlap reported by the enclosing `<NestedScrollView>` header so a
 * pinned/floating `<SliverAppBar>` doesn't paint over the inner body. Pair with
 * a `<SliverOverlapInjector>` at the top of the inner scrollable. The shared
 * handle is resolved Dart-side from the enclosing NestedScrollView — never
 * threaded through JS. Wraps a single sliver child.
 */
export function SliverOverlapAbsorber(props: SliverOverlapAbsorberProps) {
  return <sliverOverlapAbsorber {...props} />;
}
