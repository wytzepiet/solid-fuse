import 'package:flutter/material.dart';

import '../node.dart';

class FuseScrollView extends StatelessWidget {
  const FuseScrollView(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final scrollDirection = node.string('scrollDirection');
    final physics = node.string('physics');
    final reverse = node.bool('reverse');

    final scrollPhysics = switch (physics) {
      'bouncing' => const BouncingScrollPhysics(),
      'clamping' => const ClampingScrollPhysics(),
      _ => null,
    };

    return SingleChildScrollView(
      scrollDirection: scrollDirection == 'horizontal'
          ? Axis.horizontal
          : Axis.vertical,
      physics: scrollPhysics,
      reverse: reverse,
      padding: node.edgeInsets('padding'),
      child: node.buildChildren(),
    );
  }
}
