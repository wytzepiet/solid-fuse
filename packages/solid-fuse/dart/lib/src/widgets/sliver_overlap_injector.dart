import 'package:flutter/widgets.dart';

import '../node.dart';
import 'nested_scroll_view.dart';

/// A `<sliverOverlapInjector>` — injects the overlap absorbed by a matching
/// [SliverOverlapAbsorber] back into the inner scrollable of a
/// [NestedScrollView], so the first inner sliver clears the pinned header. The
/// handle is resolved from context, not threaded via JS.
class FuseSliverOverlapInjector extends StatelessWidget {
  const FuseSliverOverlapInjector(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final handle = overlapHandleOf(context);
    // Used outside a NestedScrollView: nothing to inject.
    if (handle == null) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }
    return SliverOverlapInjector(handle: handle);
  }
}
