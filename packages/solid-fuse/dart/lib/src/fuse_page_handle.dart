import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';
import 'node.dart';

/// Base class for page handles. Third-party page types
/// (`FuseCupertinoPage`, `FuseFadePage`, etc.) should extend this rather
/// than `FuseHandle<Page>` directly — it exposes a stable Flutter key and
/// a reactive content widget, and lets the Navigator widget distinguish
/// page children from accidental non-page children.
abstract class FusePageHandle extends FuseHandle<Page> {
  FusePageHandle(super.node);

  /// Stable Flutter key for this page — feeds Navigator 2.0's page diff.
  /// Use as `key:` on your `Page` subclass.
  ///
  /// Normally derived from the `_pageId` prop that `<Navigator>` assigns
  /// to each child. Used outside a Navigator (e.g. a `<materialPage>`
  /// written directly), falls back to the node id. Asserts in debug to
  /// catch the unintended case — two `ValueKey<Null>(null)`s compare
  /// equal, which silently corrupts Flutter's page diff.
  LocalKey get pageKey {
    final pageId = node.int('_pageId');
    assert(
      pageId != null,
      'FusePageHandle: missing `_pageId`. Pages should be children of '
      '<navigator>, which assigns the id. Using node id as fallback.',
    );
    return ValueKey(pageId ?? node.id);
  }

  /// Reactive widget rendering this page's JSX children as a Flex layout.
  /// Rebuilds automatically when the children or flex config change.
  /// Wrap in your page type's scaffolding (Material, CupertinoPageScaffold)
  /// at the call site.
  ///
  /// Wrapped in a lifecycle sentinel that reports the page's disposal back to
  /// JS. A popped page is deliberately kept mounted past its exit *animation*
  /// (see the `<Navigator>` `_popping` mechanism) so a shared-element flight
  /// can render its hero on the way out; its FuseNodes must only be disposed
  /// once the *route* itself is gone — strictly after that flight is handed
  /// over. The page content lives inside the route's element subtree, so its
  /// teardown is exactly the route disposal. Tying disposal here means every
  /// page type (Material, Cupertino, heroine, custom) gets correct timing with
  /// nothing to wire up — provided it renders `pageContent`.
  Widget get pageContent => _FusePageLifecycle(
    node: node,
    child: ListenableBuilder(
      listenable: node,
      builder: (_, _) => node.flexChildren,
    ),
  );
}

/// Reports the page's route disposal to JS by watching when its content leaves
/// the tree. The content is torn down when the route is disposed (after the
/// exit transition and any hero flight) — at which point the FuseNodes are
/// finally safe to drop. The JS `<Navigator>` wires `_onRouteDisposed` to its
/// controller, which then removes the entry.
class _FusePageLifecycle extends StatefulWidget {
  const _FusePageLifecycle({required this.node, required this.child});

  final FuseNode node;
  final Widget child;

  @override
  State<_FusePageLifecycle> createState() => _FusePageLifecycleState();
}

class _FusePageLifecycleState extends State<_FusePageLifecycle> {
  ModalRoute<dynamic>? _route;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _route = ModalRoute.of(context);
  }

  @override
  Widget build(BuildContext context) => widget.child;

  @override
  void dispose() {
    // Only when the route itself is gone — not when a `maintainState: false`
    // page is merely covered (its content tears down but the route stays in
    // the navigator's history, so `isActive` is still true). Disposing then
    // would drop a page the user can still navigate back to.
    if (_route == null || !_route!.isActive) {
      widget.node.callback('_onRouteDisposed')?.call();
    }
    super.dispose();
  }
}
