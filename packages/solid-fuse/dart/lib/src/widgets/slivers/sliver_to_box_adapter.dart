import 'package:flutter/widgets.dart';

import '../../node.dart';

class FuseSliverToBoxAdapter extends StatelessWidget {
  const FuseSliverToBoxAdapter(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(child: node.flexChildren);
  }
}
