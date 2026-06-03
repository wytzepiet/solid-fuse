import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

/// A `<sliverPersistentHeader>` — a [SliverPersistentHeader] whose content is
/// driven by the builder/signal pattern.
///
/// The delegate pushes the live `shrinkOffset`/`overlapsContent` to JS via the
/// `onLayout` callback on every build; the JS wrapper feeds those into its
/// builder and renders the resulting child reactively into this node, which the
/// delegate reads back through [onlyChild]. One-frame lag is expected.
class FuseSliverPersistentHeader extends StatelessWidget {
  const FuseSliverPersistentHeader(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final pinned = node.bool('pinned') ?? false;
    final floating = node.bool('floating') ?? false;
    final minExtent = node.double('minExtent') ?? 0;
    final maxExtent = node.double('maxExtent') ?? minExtent;

    return SliverPersistentHeader(
      pinned: pinned,
      floating: floating,
      delegate: _FuseHeaderDelegate(node, minExtent, maxExtent),
    );
  }
}

class _FuseHeaderDelegate extends SliverPersistentHeaderDelegate {
  _FuseHeaderDelegate(this.node, this.minExtent, this.maxExtent);

  final FuseNode node;

  @override
  final double minExtent;

  @override
  final double maxExtent;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    node.callback('onLayout')?.call({
      'shrinkOffset': shrinkOffset,
      'overlapsContent': overlapsContent,
    });
    return onlyChild(node) ?? const SizedBox();
  }

  @override
  bool shouldRebuild(_FuseHeaderDelegate oldDelegate) {
    return oldDelegate.minExtent != minExtent ||
        oldDelegate.maxExtent != maxExtent ||
        oldDelegate.node != node;
  }
}
