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
      // A child marked `_popping` has been logically popped on the JS side but
      // is kept in the node tree so its content stays alive through the exit
      // animation. Omitting it here is what tells Flutter to animate the route
      // out; the node is disposed later, when onDidRemovePage fires.
      if (child.props['_popping'] == true) continue;
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

    // `observers` is an array-of-handles prop: each element arrives as a
    // FuseNode reference whose handle wraps a NavigatorObserver (see
    // FuseNavigatorObserverHandle). Resolve each to its observer object. Lets
    // a package (e.g. heroine) supply a hero-flight controller from JS with no
    // app-side Dart.
    final observers = <NavigatorObserver>[];
    final rawObservers = node.props['observers'];
    if (rawObservers is List) {
      for (final ref in rawObservers) {
        final observer = ref is FuseNode ? ref.handle<NavigatorObserver>() : null;
        if (observer != null) observers.add(observer);
      }
    }

    return Navigator(
      pages: pages,
      observers: observers,
      onDidRemovePage: (page) {
        final id = page.key is ValueKey ? (page.key as ValueKey).value : null;
        node.callback('onDidRemovePage')?.call({'id': id});
      },
    );
  }
}
