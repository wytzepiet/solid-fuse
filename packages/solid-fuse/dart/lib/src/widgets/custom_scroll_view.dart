import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;

import '../node.dart';

class FuseCustomScrollView extends StatelessWidget {
  const FuseCustomScrollView(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final scrollDirection = node.string('scrollDirection');
    final physics = node.string('physics');
    final reverse = node.bool('reverse') ?? false;
    final primary = node.props['primary'] as bool?;
    final shrinkWrap = node.bool('shrinkWrap') ?? false;
    final restorationId = node.string('restorationId');

    final scrollPhysics = switch (physics) {
      'bouncing' => const BouncingScrollPhysics(),
      'clamping' => const ClampingScrollPhysics(),
      'always' => const AlwaysScrollableScrollPhysics(),
      'never' => const NeverScrollableScrollPhysics(),
      'page' => const PageScrollPhysics(),
      _ => null,
    };

    final axis =
        scrollDirection == 'horizontal' ? Axis.horizontal : Axis.vertical;

    final clipStr = node.string('clipBehavior');
    final clip =
        clipStr != null ? node.clipBehavior('clipBehavior') : Clip.hardEdge;

    final keyboardDismiss = switch (node.string('keyboardDismissBehavior')) {
      'onDrag' => ScrollViewKeyboardDismissBehavior.onDrag,
      _ => ScrollViewKeyboardDismissBehavior.manual,
    };

    final dragStart = switch (node.string('dragStartBehavior')) {
      'down' => DragStartBehavior.down,
      _ => DragStartBehavior.start,
    };

    final hitTest = switch (node.string('hitTestBehavior')) {
      'opaque' => HitTestBehavior.opaque,
      'translucent' => HitTestBehavior.translucent,
      'deferToChild' => HitTestBehavior.deferToChild,
      _ => HitTestBehavior.opaque,
    };

    final paintOrder = switch (node.string('paintOrder')) {
      'lastIsTop' => SliverPaintOrder.lastIsTop,
      _ => SliverPaintOrder.firstIsTop,
    };

    final cacheExtent = node.double('cacheExtent');

    final controller = node.handle<ScrollController>('controller');

    return CustomScrollView(
      controller: controller,
      scrollDirection: axis,
      physics: scrollPhysics,
      reverse: reverse,
      primary: primary,
      shrinkWrap: shrinkWrap,
      anchor: node.double('anchor') ?? 0.0,
      scrollCacheExtent:
          cacheExtent != null ? ScrollCacheExtent.pixels(cacheExtent) : null,
      clipBehavior: clip,
      keyboardDismissBehavior: keyboardDismiss,
      dragStartBehavior: dragStart,
      hitTestBehavior: hitTest,
      restorationId: restorationId,
      paintOrder: paintOrder,
      slivers: node.childWidgets,
    );
  }
}
