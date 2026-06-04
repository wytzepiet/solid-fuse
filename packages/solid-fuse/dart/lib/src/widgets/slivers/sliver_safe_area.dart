import 'package:flutter/widgets.dart';

import '../../node.dart';
import 'sliver_support.dart';

class FuseSliverSafeArea extends StatelessWidget {
  const FuseSliverSafeArea(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverSafeArea(
      top: node.bool('top') ?? true,
      bottom: node.bool('bottom') ?? true,
      left: node.bool('left') ?? true,
      right: node.bool('right') ?? true,
      minimum: node.edgeInsets('minimum') ?? EdgeInsets.zero,
      sliver: onlyChild(node)!,
    );
  }
}
