import 'package:flutter/material.dart';

import '../../node.dart';

/// The strip of tabs. Maps to Flutter's [TabBar].
///
/// With an explicit `controller` it drives that shared [TabController];
/// without one it resolves `DefaultTabController.of(context)` — so a
/// `<TabBar>` under a `<DefaultTabController>` just works, no wiring.
class FuseTabBar extends StatelessWidget {
  const FuseTabBar(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final controller = node.handle<TabController>('controller');
    final onTap = node.callback('onTap');

    final indicatorSize = switch (node.string('indicatorSize')) {
      'label' => TabBarIndicatorSize.label,
      'tab' => TabBarIndicatorSize.tab,
      _ => null,
    };

    return TabBar(
      controller: controller,
      isScrollable: node.bool('isScrollable') ?? false,
      indicatorColor: node.color('indicatorColor'),
      indicatorWeight: node.double('indicatorWeight') ?? 2.0,
      indicatorSize: indicatorSize,
      labelColor: node.color('labelColor'),
      unselectedLabelColor: node.color('unselectedLabelColor'),
      dividerColor: node.color('dividerColor'),
      dividerHeight: node.double('dividerHeight'),
      padding: node.edgeInsets('padding'),
      onTap: onTap == null ? null : (i) => onTap(i),
      tabs: node.childWidgets,
    );
  }
}
