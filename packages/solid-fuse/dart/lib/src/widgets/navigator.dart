import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../fuse_page_handle.dart';
import '../node.dart';

/// Renders a Flutter Navigator 2.0 whose pages list is driven declaratively
/// by the FuseNode's children. Each child must be a [FusePageHandle]
/// (e.g. `materialPage`, a third-party `cupertinoPage`, etc.).
///
/// The JS-side removal of a popped entry is driven by the page content's
/// `State.dispose()` (see `_FusePageLifecycle` in fuse_page_handle.dart),
/// which fires for every removal path — app- or Flutter-initiated. The
/// `onDidRemovePage` hook below is a harmless redundant trigger for
/// Flutter-initiated pops (hardware back, swipe); the JS handler is id-keyed
/// and idempotent, so whichever path fires first wins and the other no-ops.
class FuseNavigatorWidget extends StatelessWidget {
  const FuseNavigatorWidget(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    // A JS-initiated pop toggles a child's `_popping` prop instead of removing
    // the child — keeping the page's content alive through its exit animation.
    // That prop change only marks the child dirty, not this navigator node, so
    // listen to the children directly: when one flips `_popping` we rebuild and
    // re-filter `pages`. Child insert/remove dirties this node and re-runs the
    // build (via FuseNodeWidget's node-level listener), re-subscribing here.
    return ListenableBuilder(
      listenable: Listenable.merge(node.children),
      builder: (context, _) => _buildNavigator(context),
    );
  }

  Widget _buildNavigator(BuildContext context) {
    final pages = <Page<dynamic>>[];
    for (final child in node.children) {
      // A child marked `_popping` has been logically popped on the JS side but
      // is kept in the node tree so its content stays alive through the exit
      // animation. Omitting it here is what tells Flutter to animate the route
      // out; the node is disposed later, when the route's element subtree is
      // torn down and the page content's State.dispose() fires the JS removal.
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
