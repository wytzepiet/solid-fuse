import 'package:flutter/material.dart';

import '../../node.dart';

/// Provides a [TabController] to its subtree via context. Maps to Flutter's
/// [DefaultTabController].
///
/// The common case: a `<TabBar>` and `<TabBarView>` anywhere below pick this
/// controller up automatically, no explicit handle needed. Use
/// `createTabController` instead when JS needs the index or programmatic
/// `animateTo` / `jumpTo`.
class FuseDefaultTabController extends StatelessWidget {
  const FuseDefaultTabController(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: node.int('length') ?? 0,
      initialIndex: node.int('initialIndex') ?? 0,
      child: node.flexChildren,
    );
  }
}
