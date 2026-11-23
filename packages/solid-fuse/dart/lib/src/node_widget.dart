import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

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
      builder: (context, _) =>
          _flexItem(_testId(runtime.buildWidgetForNode(node))),
    );
  }

  // `testId` on any element: a semantics identifier, which `fuse drive`
  // (Marionette), Appium and the platform accessibility tools find it by.
  // Not on a widget that only positions its child in the parent (Expanded,
  // Positioned): that must stay the parent's direct child.
  Widget _testId(Widget built) {
    final id = node['testId'];
    if (id is! String || built is ParentDataWidget) return built;
    return Semantics(identifier: id, child: built);
  }

  // `flex` on any element: its share of a Flex parent's free space. Not
  // when the widget already is one (a generated Expanded keeps its own).
  Widget _flexItem(Widget built) {
    final share = node['flex'];
    if (share is! num || share <= 0 || built is Flexible) return built;
    return Expanded(flex: share.round(), child: built);
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
