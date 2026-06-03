import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

class FuseSliverOpacity extends StatelessWidget {
  const FuseSliverOpacity(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverOpacity(
      opacity: node.double('opacity') ?? 1.0,
      alwaysIncludeSemantics: node.bool('alwaysIncludeSemantics') ?? false,
      sliver: onlyChild(node)!,
    );
  }
}
