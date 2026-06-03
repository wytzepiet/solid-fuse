import 'package:flutter/widgets.dart';

import '../node.dart';

class FuseSliverCrossAxisGroup extends StatelessWidget {
  const FuseSliverCrossAxisGroup(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverCrossAxisGroup(slivers: node.childWidgets);
  }
}
