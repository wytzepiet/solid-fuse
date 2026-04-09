import 'package:flutter/material.dart';

import '../node.dart';
import '../node_widget.dart';
import '../runtime.dart';

class FuseNavigatorWidget extends StatelessWidget {
  const FuseNavigatorWidget(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final children = node.children;
    if (children.isEmpty) return const SizedBox.shrink();

    final runtime = FuseRuntimeScope.of(context);

    final pages = <Page<dynamic>>[
      for (final child in children)
        runtime.buildPageForNode(child) ??
            MaterialPage(
              key: ValueKey(child.id),
              child: FuseNodeWidget(node: child),
            ),
    ];

    return Navigator(
      pages: pages,
      onDidRemovePage: (_) {
        node.function('onPopPage')?.call();
      },
    );
  }
}
