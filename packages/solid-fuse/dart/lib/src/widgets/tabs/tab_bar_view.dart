import 'package:flutter/material.dart';

import '../../node.dart';

/// The swipeable pages. Maps to Flutter's [TabBarView].
///
/// Shares its [TabController] with a [TabBar] the same way: an explicit
/// `controller`, or `DefaultTabController.of(context)` when omitted. Each
/// child node is one page.
class FuseTabBarView extends StatelessWidget {
  const FuseTabBarView(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final controller = node.handle<TabController>('controller');

    final physics = switch (node.string('physics')) {
      'bouncing' => const BouncingScrollPhysics(),
      'clamping' => const ClampingScrollPhysics(),
      'always' => const AlwaysScrollableScrollPhysics(),
      'never' => const NeverScrollableScrollPhysics(),
      'page' => const PageScrollPhysics(),
      _ => null,
    };

    return TabBarView(
      controller: controller,
      physics: physics,
      viewportFraction: node.double('viewportFraction') ?? 1.0,
      children: node.childWidgets,
    );
  }
}
