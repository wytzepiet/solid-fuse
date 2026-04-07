import 'package:flutter/material.dart';

import '../node.dart';

class FusePositioned extends StatelessWidget {
  const FusePositioned(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: node.double('top'),
      left: node.double('left'),
      right: node.double('right'),
      bottom: node.double('bottom'),
      width: node.double('width'),
      height: node.double('height'),
      child: node.buildChildren(),
    );
  }
}
