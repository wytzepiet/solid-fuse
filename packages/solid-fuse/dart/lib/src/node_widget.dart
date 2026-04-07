import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'node.dart';
import 'runtime.dart';

class FuseNodeWidget extends StatelessWidget {
  FuseNodeWidget({required this.node}) : super(key: ValueKey(node.id));

  final FuseNode node;

  @override
  StatelessElement createElement() =>
      kDebugMode ? _FuseErrorElement(this) : super.createElement();

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

class _FuseErrorElement extends StatelessElement {
  _FuseErrorElement(FuseNodeWidget super.widget);

  @override
  Widget build() {
    try {
      return super.build();
    } catch (e, stack) {
      final nodeWidget = widget as FuseNodeWidget;
      final relevantFrames = stack
          .toString()
          .split('\n')
          .where(
            (l) =>
                l.contains('package:solid_fuse/') || l.contains('package:fuse'),
          )
          .join('\n');
      debugPrint('[Fuse] $e\n$relevantFrames');
      return FuseRuntimeScope.of(this)
          .devError(nodeWidget.node, e.toString());
    }
  }
}
