import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

class FuseSliverGrid extends StatelessWidget {
  const FuseSliverGrid(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverGrid(
      gridDelegate: fuseGridDelegate(node),
      delegate: fuseSliverChildDelegate(
        node,
        addAutomaticKeepAlives: node.bool('addAutomaticKeepAlives') ?? true,
        addRepaintBoundaries: node.bool('addRepaintBoundaries') ?? true,
        addSemanticIndexes: node.bool('addSemanticIndexes') ?? true,
      ),
    );
  }
}
