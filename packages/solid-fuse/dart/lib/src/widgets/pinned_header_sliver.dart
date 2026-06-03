import 'package:flutter/widgets.dart';

import '../node.dart';

/// A sliver that keeps its single child pinned at the leading edge of the
/// viewport while the rest of the scroll content scrolls past.
///
/// Requires Flutter >= 3.24.
class FusePinnedHeaderSliver extends StatelessWidget {
  const FusePinnedHeaderSliver(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return PinnedHeaderSliver(child: node.flexChildren);
  }
}
