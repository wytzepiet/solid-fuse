import 'package:flutter/material.dart';

import '../fuse_widget.dart';

class FuseScrollView extends FuseWidget {
  const FuseScrollView({super.key, required super.node});

  @override
  Widget build(BuildContext context) {
    final scrollDirection = node.string('scrollDirection');
    final flexDirection = node.map('flex')?.string('direction');
    final isHorizontal = (scrollDirection ?? flexDirection) == 'horizontal';

    // Sync: if scrollDirection is set but flex.direction isn't, default flex to match.
    if (scrollDirection != null && flexDirection == null) {
      final f = (node.props['flex'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      f['direction'] = scrollDirection;
      node.props['flex'] = f;
    }

    final padding = node.edgeInsets('padding');
    final reverse = node.bool('reverse');

    final physicsStr = node.string('physics');
    final physics = switch (physicsStr) {
      'bouncing' => const BouncingScrollPhysics(),
      'clamping' => const ClampingScrollPhysics(),
      _ => null,
    };

    return SingleChildScrollView(
      scrollDirection: isHorizontal ? Axis.horizontal : Axis.vertical,
      padding: padding,
      reverse: reverse,
      physics: physics,
      child: buildChildren(),
    );
  }
}
