import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../node.dart';
import '../node_widget.dart';

/// A [PageView.builder] over a node's eager [FuseNode.children]: children are
/// built on demand (Flutter inflates only the visible window), keyed by the
/// `ValueKey<int>(node.id)` that [FuseNodeWidget] applies so state survives
/// reorder/insert.
class FusePageView extends StatelessWidget {
  const FusePageView(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final axis = node.string('scrollDirection') == 'vertical'
        ? Axis.vertical
        : Axis.horizontal;

    final scrollPhysics = switch (node.string('physics')) {
      'bouncing' => const BouncingScrollPhysics(),
      'clamping' => const ClampingScrollPhysics(),
      'always' => const AlwaysScrollableScrollPhysics(),
      'never' => const NeverScrollableScrollPhysics(),
      'page' => const PageScrollPhysics(),
      _ => null,
    };

    final dragStart = switch (node.string('dragStartBehavior')) {
      'down' => DragStartBehavior.down,
      _ => DragStartBehavior.start,
    };

    final clip = node.string('clipBehavior') != null
        ? node.clipBehavior('clipBehavior')
        : Clip.hardEdge;

    final controller = node.handle<PageController>('controller');
    final onPageChanged = node.callback('onPageChanged');

    return PageView.builder(
      controller: controller,
      scrollDirection: axis,
      reverse: node.bool('reverse') ?? false,
      physics: scrollPhysics,
      pageSnapping: node.bool('pageSnapping') ?? true,
      allowImplicitScrolling: node.bool('allowImplicitScrolling') ?? false,
      padEnds: node.bool('padEnds') ?? true,
      clipBehavior: clip,
      dragStartBehavior: dragStart,
      restorationId: node.string('restorationId'),
      onPageChanged: onPageChanged == null ? null : (i) => onPageChanged(i),
      itemCount: node.children.length,
      itemBuilder: (_, i) => FuseNodeWidget(node: node.children[i]),
      findChildIndexCallback: (Key key) {
        if (key is! ValueKey<int>) return null;
        final id = key.value;
        for (var i = 0; i < node.children.length; i++) {
          if (node.children[i].id == id) return i;
        }
        return null;
      },
    );
  }
}
