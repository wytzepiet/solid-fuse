import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../fuse_page_handle.dart';
import '../node.dart';

/// Renders a Flutter Navigator 2.0 whose pages list is driven declaratively
/// by the FuseNode's children. Each child must be a [FusePageHandle]
/// (e.g. `materialPage`, a third-party `cupertinoPage`, etc.).
///
/// When Flutter removes a page (hardware back, swipe, or mid-stack
/// declarative removal whose animation completed), we forward the popped
/// page's key (the JS-assigned entry id) to JS. JS removes the entry from
/// its pages signal, which round-trips as ops to remove the child node —
/// but Flutter has already popped, so the rebuild is a no-op visually.
class FuseNavigatorWidget extends StatelessWidget {
  const FuseNavigatorWidget(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final pages = <Page<dynamic>>[];
    for (final child in node.children) {
      final h = child.ownHandle;
      if (h is FusePageHandle) {
        pages.add(h.object);
      } else if (kDebugMode) {
        debugPrint(
          '[Fuse navigator] child <${child.type}> is not a FusePageHandle — ignored',
        );
      }
    }
    if (pages.isEmpty) return const SizedBox.shrink();
    return Navigator(
      pages: pages,
      onDidRemovePage: (page) {
        final id = page.key is ValueKey ? (page.key as ValueKey).value : null;
        node.function('onDidRemovePage')?.call({'id': id});
      },
    );
  }
}
