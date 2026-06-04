import 'package:flutter/widgets.dart';

import '../node.dart';

class FuseAbsorbPointer extends StatelessWidget {
  const FuseAbsorbPointer(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return AbsorbPointer(
      absorbing: node.bool('absorbing') ?? true,
      child: node.flexChildren,
    );
  }
}
