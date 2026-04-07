import 'package:flutter/material.dart';

import '../node.dart';

class FuseGestureDetector extends StatelessWidget {
  const FuseGestureDetector(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: node.function('onTap'),
      onDoubleTap: node.function('onDoubleTap'),
      onLongPress: node.function('onLongPress'),
      child: node.buildChildren(),
    );
  }
}
