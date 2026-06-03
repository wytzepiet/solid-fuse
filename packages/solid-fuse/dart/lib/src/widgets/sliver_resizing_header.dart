import 'package:flutter/widgets.dart';

import '../node.dart';

/// A sliver that resizes its pinned single child between an optional
/// `maxExtent` and `minExtent` as the user scrolls, then stays pinned.
///
/// The extents are supplied as numbers and synthesized into sized prototype
/// widgets. When omitted, the child's intrinsic size is used (minimum 0).
///
/// Requires Flutter >= 3.24.
class FuseSliverResizingHeader extends StatelessWidget {
  const FuseSliverResizingHeader(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final minExtent = node.double('minExtent');
    final maxExtent = node.double('maxExtent');

    return SliverResizingHeader(
      minExtentPrototype: minExtent != null ? SizedBox(height: minExtent) : null,
      maxExtentPrototype: maxExtent != null ? SizedBox(height: maxExtent) : null,
      child: node.flexChildren,
    );
  }
}
