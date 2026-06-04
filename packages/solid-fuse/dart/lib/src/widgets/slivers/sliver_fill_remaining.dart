import 'package:flutter/widgets.dart';

import '../../node.dart';

class FuseSliverFillRemaining extends StatelessWidget {
  const FuseSliverFillRemaining(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverFillRemaining(
      hasScrollBody: node.bool('hasScrollBody') ?? true,
      fillOverscroll: node.bool('fillOverscroll') ?? false,
      child: node.flexChildren,
    );
  }
}
