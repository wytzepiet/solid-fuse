import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../node.dart';

class FuseScrollView extends StatelessWidget {
  const FuseScrollView(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final scrollDirection = node.string('scrollDirection');
    final flexDirection = node.map('layout')?.string('direction');
    final physics = node.string('physics');
    final reverse = node.bool('reverse') ?? false;
    final primary = node.props['primary'] as bool?;
    final restorationId = node.string('restorationId');

    final scrollPhysics = switch (physics) {
      'bouncing' => const BouncingScrollPhysics(),
      'clamping' => const ClampingScrollPhysics(),
      'always' => const AlwaysScrollableScrollPhysics(),
      'never' => const NeverScrollableScrollPhysics(),
      'page' => const PageScrollPhysics(),
      _ => null,
    };

    final axis = (scrollDirection ?? flexDirection) == 'horizontal'
        ? Axis.horizontal
        : Axis.vertical;

    final clipStr = node.string('clipBehavior');
    final clip = clipStr != null ? node.clipBehavior('clipBehavior') : Clip.hardEdge;

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

    final controller = node.props['controller'] as ScrollController?;

    return SingleChildScrollView(
      controller: controller,
      scrollDirection: axis,
      physics: scrollPhysics,
      reverse: reverse,
      primary: primary,
      padding: node.edgeInsets('padding'),
      clipBehavior: clip,
      keyboardDismissBehavior: keyboardDismiss,
      dragStartBehavior: dragStart,
      hitTestBehavior: hitTest,
      restorationId: restorationId,
      child: node.buildLayout(),
    );
  }
}
