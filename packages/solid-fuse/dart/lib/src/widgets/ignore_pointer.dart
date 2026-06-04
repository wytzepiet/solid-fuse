import 'package:flutter/widgets.dart';

import '../node.dart';

class FuseIgnorePointer extends StatelessWidget {
  const FuseIgnorePointer(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: node.bool('ignoring') ?? true,
      child: node.flexChildren,
    );
  }
}
