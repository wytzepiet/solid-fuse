import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';

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
  Widget get pageContent => ListenableBuilder(
    listenable: node,
    builder: (_, _) => node.flexChildren,
  );
}
