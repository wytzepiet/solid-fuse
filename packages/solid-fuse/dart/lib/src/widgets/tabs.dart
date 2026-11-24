import 'package:flutter/widgets.dart';

import '../node.dart';

/// `<tabs>`: a tabs layout's content. Every child (a tab's Navigator) stays
/// alive; the hidden ones don't tick, can't be focused or tapped, and don't
/// take the back button (their Navigator reads [TickerMode]). With
/// `backToFirst`, back goes to the first tab instead of leaving.
class FuseTabs extends StatelessWidget {
  const FuseTabs(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final index = node.int('index') ?? 0;
    final backToFirst = node.bool('backToFirst') ?? false;
    final children = node.childWidgets;
    return PopScope<Object?>(
      canPop: !backToFirst,
      onPopInvokedWithResult: (didPop, _) {
        // Every pop handler on the route hears the back press; act only
        // when this one held it.
        if (!didPop && backToFirst) node.callback('onBack')?.call();
      },
      child: IndexedStack(
        index: index.clamp(0, children.isEmpty ? 0 : children.length - 1),
        sizing: StackFit.expand,
        children: [
          for (final (i, child) in children.indexed)
            TickerMode(
              enabled: i == index,
              child: HeroMode(
                enabled: i == index,
                child: ExcludeFocus(excluding: i != index, child: child),
              ),
            ),
        ],
      ),
    );
  }
}
