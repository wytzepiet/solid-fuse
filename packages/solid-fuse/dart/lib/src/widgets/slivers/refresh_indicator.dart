import 'package:flutter/material.dart';

import '../../node.dart';

class FuseRefreshIndicator extends StatelessWidget {
  const FuseRefreshIndicator(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final onRefresh = node.asyncCallback('onRefresh');
    final triggerMode = node.string('triggerMode') == 'anywhere'
        ? RefreshIndicatorTriggerMode.anywhere
        : RefreshIndicatorTriggerMode.onEdge;
    final color = node.color('color');
    final backgroundColor = node.color('backgroundColor');
    final displacement = node.double('displacement') ?? 40;
    final edgeOffset = node.double('edgeOffset') ?? 0;
    final strokeWidth = node.double('strokeWidth') ?? 2.5;
    final child = node.flexChildren;

    Future<void> handleRefresh() async {
      await onRefresh?.call();
    }

    if (node.bool('adaptive') == true) {
      return RefreshIndicator.adaptive(
        onRefresh: handleRefresh,
        triggerMode: triggerMode,
        color: color,
        backgroundColor: backgroundColor,
        displacement: displacement,
        edgeOffset: edgeOffset,
        strokeWidth: strokeWidth,
        child: child,
      );
    }

    return RefreshIndicator(
      onRefresh: handleRefresh,
      triggerMode: triggerMode,
      color: color,
      backgroundColor: backgroundColor,
      displacement: displacement,
      edgeOffset: edgeOffset,
      strokeWidth: strokeWidth,
      child: child,
    );
  }
}
