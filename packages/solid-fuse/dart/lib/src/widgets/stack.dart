import 'package:flutter/material.dart';

import '../fuse_widget.dart';
import '../node.dart';
import '../runtime.dart';

class FuseStack extends FuseWidget {
  const FuseStack({super.key, required super.node});

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
        return _StackChild(key: ValueKey(child.id), node: child);
      }).toList(),
    );
  }
}

class _StackChild extends StatelessWidget {
  const _StackChild({super.key, required this.node});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: node,
      builder: (context, _) {
        final inner = FuseRuntimeScope.of(context).buildWidgetForNode(node);

        final top = node.double('top');
        final left = node.double('left');
        final right = node.double('right');
        final bottom = node.double('bottom');

        if (top != null || left != null || right != null || bottom != null) {
          return Positioned(
            top: top,
            left: left,
            right: right,
            bottom: bottom,
            child: inner,
          );
        }

        return inner;
      },
    );
  }
}
