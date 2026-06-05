import 'package:flutter/material.dart';

import '../node.dart';

class FusePositioned extends StatelessWidget {
  const FusePositioned(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final fill = node.bool('fill') ?? false;
    return Positioned(
      top: node.double('top') ?? (fill ? 0 : null),
      left: node.double('left') ?? (fill ? 0 : null),
      right: node.double('right') ?? (fill ? 0 : null),
      bottom: node.double('bottom') ?? (fill ? 0 : null),
      width: node.double('width'),
      height: node.double('height'),
      child: node.flexChildren,
    );
  }
}
