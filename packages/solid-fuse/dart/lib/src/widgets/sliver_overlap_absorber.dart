import 'package:flutter/widgets.dart';

import '../node.dart';
import 'nested_scroll_view.dart';
import 'sliver_support.dart';

/// A `<sliverOverlapAbsorber>` — wraps a single sliver child in a
/// [SliverOverlapAbsorber], reporting its overlap to the enclosing
/// [NestedScrollView]'s handle so a pinned/floating header doesn't paint over
/// the inner body. The handle is resolved from context, not threaded via JS.
class FuseSliverOverlapAbsorber extends StatelessWidget {
  const FuseSliverOverlapAbsorber(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final handle = overlapHandleOf(context);
    final sliver = onlyChild(node);
    // Used outside a NestedScrollView: render the child sliver unabsorbed
    // rather than crashing.
    if (handle == null) {
      return sliver ?? const SliverToBoxAdapter(child: SizedBox.shrink());
    }
    return SliverOverlapAbsorber(handle: handle, sliver: sliver);
  }
}
