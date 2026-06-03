import 'package:flutter/widgets.dart';

import '../node.dart';

/// Starts a reorder drag in the enclosing [SliverReorderableList] as soon as its
/// child is touched. Wrap (part of) a reorderable item with this to make it the
/// drag handle.
class FuseReorderableDragStartListener extends StatelessWidget {
  const FuseReorderableDragStartListener(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return ReorderableDragStartListener(
      index: node.int('index') ?? 0,
      enabled: node.bool('enabled') ?? true,
      child: node.flexChildren,
    );
  }
}
