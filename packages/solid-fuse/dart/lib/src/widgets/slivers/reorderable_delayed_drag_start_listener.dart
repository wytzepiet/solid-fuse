import 'package:flutter/widgets.dart';

import '../../node.dart';

/// Like [ReorderableDragStartListener], but starts the reorder drag only after a
/// long press on its child.
class FuseReorderableDelayedDragStartListener extends StatelessWidget {
  const FuseReorderableDelayedDragStartListener(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return ReorderableDelayedDragStartListener(
      index: node.int('index') ?? 0,
      enabled: node.bool('enabled') ?? true,
      child: node.flexChildren,
    );
  }
}
