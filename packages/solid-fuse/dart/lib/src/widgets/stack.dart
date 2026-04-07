import 'package:flutter/material.dart';

import '../node.dart';
import '../node_widget.dart';

class FuseStack extends StatelessWidget {
  const FuseStack(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final alignment = node.alignment('alignment') ?? Alignment.topLeft;
    final fitStr = node.string('fit');
    final fit = fitStr == 'expand' ? StackFit.expand : StackFit.loose;
    final clipBehavior = node.clipBehavior('clipBehavior');

    return Stack(
      alignment: alignment,
      fit: fit,
      clipBehavior: clipBehavior,
      children: node.children.map((child) {
        return FuseNodeWidget(node: child);
      }).toList(),
    );
  }
}
