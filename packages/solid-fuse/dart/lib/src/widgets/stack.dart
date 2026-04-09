import 'package:flutter/material.dart';

import '../node.dart';

class FuseStack extends StatelessWidget {
  const FuseStack(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final alignment = node.alignment('alignment') ?? Alignment.topLeft;
    final fitStr = node.string('fit');
    final fit = switch (fitStr) {
      'expand' => StackFit.expand,
      'passthrough' => StackFit.passthrough,
      _ => StackFit.loose,
    };
    final clipBehavior = node.clipBehavior('clipBehavior');

    final textDirection = switch (node.string('textDirection')) {
      'ltr' => TextDirection.ltr,
      'rtl' => TextDirection.rtl,
      _ => null,
    };

    return Stack(
      alignment: alignment,
      textDirection: textDirection,
      fit: fit,
      clipBehavior: clipBehavior,
      children: node.childWidgets,
    );
  }
}
