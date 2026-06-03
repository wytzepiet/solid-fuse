import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

class FuseSliverList extends StatelessWidget {
  const FuseSliverList(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final delegate = fuseSliverChildDelegate(
      node,
      addAutomaticKeepAlives: node.bool('addAutomaticKeepAlives') ?? true,
      addRepaintBoundaries: node.bool('addRepaintBoundaries') ?? true,
      addSemanticIndexes: node.bool('addSemanticIndexes') ?? true,
    );

    final itemExtent = node.double('itemExtent');
    if (itemExtent != null) {
      return SliverFixedExtentList(itemExtent: itemExtent, delegate: delegate);
    }

    final prototypeItem = node.widget('prototypeItem');
    if (prototypeItem != null) {
      return SliverPrototypeExtentList(
        prototypeItem: prototypeItem,
        delegate: delegate,
      );
    }

    return SliverList(delegate: delegate);
  }
}
