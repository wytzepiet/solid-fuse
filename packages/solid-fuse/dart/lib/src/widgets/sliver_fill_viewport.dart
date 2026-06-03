import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

class FuseSliverFillViewport extends StatelessWidget {
  const FuseSliverFillViewport(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverFillViewport(
      viewportFraction: node.double('viewportFraction') ?? 1.0,
      padEnds: node.bool('padEnds') ?? true,
      delegate: fuseSliverChildDelegate(
        node,
        addAutomaticKeepAlives: node.bool('addAutomaticKeepAlives') ?? true,
        addRepaintBoundaries: node.bool('addRepaintBoundaries') ?? true,
        addSemanticIndexes: node.bool('addSemanticIndexes') ?? true,
      ),
    );
  }
}
