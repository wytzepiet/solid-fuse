import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

class FuseSliverCrossAxisExpanded extends StatelessWidget {
  const FuseSliverCrossAxisExpanded(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverCrossAxisExpanded(
      flex: node.int('flex') ?? 1,
      sliver: onlyChild(node)!,
    );
  }
}
