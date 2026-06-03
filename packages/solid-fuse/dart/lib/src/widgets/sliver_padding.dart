import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

class FuseSliverPadding extends StatelessWidget {
  const FuseSliverPadding(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: node.edgeInsets('padding') ?? EdgeInsets.zero,
      sliver: onlyChild(node),
    );
  }
}
