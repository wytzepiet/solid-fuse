import 'package:flutter/material.dart';

import 'node.dart';
import 'runtime.dart';

class FuseNodeWidget extends StatelessWidget {
  const FuseNodeWidget({required super.key, required this.node});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final runtime = FuseRuntimeScope.of(context);
    if (!runtime.updatesOnNodeChange(node.type)) {
      return runtime.buildWidgetForNode(node);
    }
    return ListenableBuilder(
      listenable: node,
      builder: (context, _) => runtime.buildWidgetForNode(node),
    );
  }
}
