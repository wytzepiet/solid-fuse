import 'package:flutter/widgets.dart';

import '../../node.dart';

/// A sliver whose single child floats back into view as soon as the user
/// scrolls towards the leading edge, regardless of the current scroll offset.
///
/// `animationStyle` overrides the default 300ms / easeInOut show & hide
/// animation. `snapMode` controls how a partially visible header settles when
/// a scroll gesture ends (requires Flutter >= 3.27).
///
/// Requires Flutter >= 3.24.
class FuseSliverFloatingHeader extends StatelessWidget {
  const FuseSliverFloatingHeader(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final style = node.map('animationStyle');
    final animationStyle = style == null
        ? null
        : AnimationStyle(
            duration: style.int('duration') != null
                ? Duration(milliseconds: style.int('duration')!)
                : null,
            curve: style['curve'] != null ? style.curve('curve') : null,
          );

    final snapMode = switch (node.string('snapMode')) {
      'overlay' => FloatingHeaderSnapMode.overlay,
      'scroll' => FloatingHeaderSnapMode.scroll,
      _ => null,
    };

    return SliverFloatingHeader(
      animationStyle: animationStyle,
      snapMode: snapMode,
      child: node.flexChildren,
    );
  }
}
