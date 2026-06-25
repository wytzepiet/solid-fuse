import 'dart:async';

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
  /// Wrapped in a [_FusePageLifecycle] sentinel so that when Flutter tears
  /// down this route's element subtree — for *every* removal, whether
  /// app-initiated (declarative `pages:` omission via `nav.pop()`) or
  /// Flutter-initiated (system back, swipe, route self-pop) — we fire the
  /// JS-side removal. `Navigator.onDidRemovePage` only fires for the latter,
  /// so on iOS (where every pop is app-initiated) it never fired and the
  /// popped page's node — e.g. a still-decoding video controller — leaked
  /// forever. `State.dispose()` is the one signal that covers all paths.
  Widget get pageContent => _FusePageLifecycle(
    node: node,
    child: ListenableBuilder(
      listenable: node,
      builder: (_, _) => node.flexChildren,
    ),
  );
}

/// Sentinel that fires the page node's `_onDisposed` callback when Flutter
/// tears down the route's element subtree — the reliable "this route is
/// actually gone" signal, firing for app- and Flutter-initiated removals
/// alike (unlike `Navigator.onDidRemovePage`, which only fires for
/// Flutter-initiated pops).
class _FusePageLifecycle extends StatefulWidget {
  const _FusePageLifecycle({required this.node, required this.child});

  final FuseNode node;
  final Widget child;

  @override
  State<_FusePageLifecycle> createState() => _FusePageLifecycleState();
}

class _FusePageLifecycleState extends State<_FusePageLifecycle> {
  @override
  void dispose() {
    // dispose() runs mid-frame inside Flutter's route teardown. Calling the
    // JS removal synchronously would re-enter disposal of the same FuseNode
    // subtree (removeEntry disposes the node we're inside). A microtask runs
    // at the end of the current turn — reliable and not vsync-gated, so it
    // can't stall when the tree goes idle (unlike requestAnimationFrame). The
    // JS handler is id-keyed and idempotent, so racing other removal paths is
    // harmless.
    final fire = widget.node.callback('_onDisposed');
    if (fire != null) scheduleMicrotask(fire);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
