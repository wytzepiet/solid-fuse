import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../fuse_page_handle.dart';
import '../generated_support.dart';
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
/// [NavigatorPopHandler] hands it to this one while it has pages to pop and
/// it's shown (not a hidden tab).
class FuseNavigatorWidget extends StatefulWidget {
  const FuseNavigatorWidget(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseNavigatorWidget> createState() => _FuseNavigatorWidgetState();
}

class _FuseNavigatorWidgetState extends State<FuseNavigatorWidget> {
  final _key = GlobalKey<NavigatorState>();

  // Flutter's Navigator hides its own hero controller from navigators
  // inside it (`HeroControllerScope.none`), and this one is always inside
  // the app's. Without a controller of its own, heroes would not fly.
  final _heroes = HeroController();

  // The same list while the observers are the same: Navigator detaches and
  // attaches them again whenever it gets a different one.
  List<NavigatorObserver> _observerList = const [];
  List<NavigatorObserver> _observers() {
    final now = [
      for (final o in (widget.node.props['observers'] as List?) ?? const [])
        ?decHandle<NavigatorObserver>(widget.node, o),
    ];
    if (!listEquals(now, _observerList)) _observerList = now;
    return _observerList;
  }

  @override
  void dispose() {
    _heroes.dispose();
    super.dispose();
  }

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
    // A hidden tab (`<tabs>` turns its tickers off) doesn't take back. Every
    // pop handler on a route hears a back press, enabled or not, so the
    // handler checks too.
    final shown = TickerMode.valuesOf(context).enabled;
    return NavigatorPopHandler<Object?>(
      enabled: shown,
      onPopWithResult: (_) {
        if (shown) _key.currentState?.maybePop();
      },
      child: HeroControllerScope(
        controller: _heroes,
        child: Navigator(
          key: _key,
          pages: pages,
          observers: _observers(),
          onDidRemovePage: (page) {
            final id = page.key is ValueKey ? (page.key as ValueKey).value : null;
            node.callback('onDidRemovePage')?.call({'id': id});
          },
        ),
      ),
    );
  }
}
