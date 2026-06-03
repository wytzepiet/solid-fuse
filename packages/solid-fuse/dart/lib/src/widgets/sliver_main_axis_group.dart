import 'package:flutter/widgets.dart';

import '../node.dart';

class FuseSliverMainAxisGroup extends StatelessWidget {
  const FuseSliverMainAxisGroup(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverMainAxisGroup(slivers: node.childWidgets);
  }
}
