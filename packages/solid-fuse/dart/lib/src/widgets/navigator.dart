import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

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
///
/// The system back gesture reaches the app's root Navigator first; a
/// [NavigatorPopHandler] hands it to this one while it has pages to pop.
class FuseNavigatorWidget extends StatefulWidget {
  const FuseNavigatorWidget(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseNavigatorWidget> createState() => _FuseNavigatorWidgetState();
}

class _FuseNavigatorWidgetState extends State<FuseNavigatorWidget> {
  final _key = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
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
    return NavigatorPopHandler<Object?>(
      onPopWithResult: (_) => _key.currentState?.maybePop(),
      child: Navigator(
        key: _key,
        pages: pages,
        onDidRemovePage: (page) {
          final id = page.key is ValueKey ? (page.key as ValueKey).value : null;
          node.callback('onDidRemovePage')?.call({'id': id});
        },
      ),
    );
  }
}
