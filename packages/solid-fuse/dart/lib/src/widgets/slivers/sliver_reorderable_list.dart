import 'package:flutter/widgets.dart';

import '../../node.dart';
import '../../node_widget.dart';

/// A sliver list whose items can be reordered by dragging.
///
/// Items are the node's eager children, each already keyed by `ValueKey(node.id)`
/// via [FuseNodeWidget] — `SliverReorderableList` requires a [Key] on every item,
/// which that provides. Reordering is *not* applied automatically: the
/// `onReorder` callback reports the move so JS can update its data.
class FuseSliverReorderableList extends StatelessWidget {
  const FuseSliverReorderableList(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final onReorder = node.callback('onReorder');
    final onReorderStart = node.callback('onReorderStart');
    final onReorderEnd = node.callback('onReorderEnd');

    return SliverReorderableList(
      itemCount: node.children.length,
      itemBuilder: (_, i) => FuseNodeWidget(node: node.children[i]),
      // `onReorder` is the stable API this contract targets. On newer SDKs it is
      // deprecated in favour of `onReorderItem` (identical signature, only the
      // newIndex adjustment differs); ignore the deprecation to compile clean on
      // both. We forward the raw oldIndex/newIndex; JS owns the splice.
      // ignore: deprecated_member_use
      onReorder: (oldIndex, newIndex) =>
          onReorder?.call({'oldIndex': oldIndex, 'newIndex': newIndex}),
      onReorderStart: onReorderStart == null
          ? null
          : (index) => onReorderStart(index),
      onReorderEnd: onReorderEnd == null ? null : (index) => onReorderEnd(index),
      itemExtent: node.double('itemExtent'),
      prototypeItem: node.widget('prototypeItem'),
    );
  }
}
