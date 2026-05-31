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
    return ListenableBuilder(
      listenable: node,
      builder: (context, _) => runtime.buildWidgetForNode(node),
    );
  }

  // Surface the solid-fuse identity to the Flutter widget inspector. Without
  // this every node reads as "FuseNodeWidget"; instead the tree shows e.g.
  // `view «PhonePage»` and the property panel lists the JSX type, originating
  // component, and node id. `component` is only populated in dev builds.
  @override
  String toStringShort() => node.component != null
      ? '${node.type} «${node.component}»'
      : node.type;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('fuseType', node.type, quoted: false));
    if (node.component != null) {
      properties.add(StringProperty('component', node.component, quoted: false));
    }
    properties.add(IntProperty('nodeId', node.id));
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
