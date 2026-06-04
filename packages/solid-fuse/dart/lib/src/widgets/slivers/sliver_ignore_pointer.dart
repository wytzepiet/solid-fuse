import 'package:flutter/widgets.dart';

import '../../node.dart';
import 'sliver_support.dart';

class FuseSliverIgnorePointer extends StatelessWidget {
  const FuseSliverIgnorePointer(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverIgnorePointer(
      ignoring: node.bool('ignoring') ?? true,
      sliver: onlyChild(node)!,
    );
  }
}
