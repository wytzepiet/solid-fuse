import 'package:flutter/widgets.dart';

import '../../node.dart';
import 'sliver_support.dart';

class FuseSliverConstrainedCrossAxis extends StatelessWidget {
  const FuseSliverConstrainedCrossAxis(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverConstrainedCrossAxis(
      maxExtent: node.double('maxExtent') ?? double.infinity,
      sliver: onlyChild(node)!,
    );
  }
}
