import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';
import 'generated_support.dart';
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
  /// Rebuilds automatically when the children or layout change.
  /// Wrap in your page type's scaffolding (Material, CupertinoPageScaffold)
  /// at the call site.
  Widget get pageContent => ListenableBuilder(
    listenable: node,
    builder: (_, _) => node.layoutChildren,
  );
}

/// The route options every page type can take from JS, and a transition
/// written in JS. A page type's `createRoute` reads them, so its route
/// keeps its own behaviour (a mixin, a gesture) and JS still decides how
/// it looks:
///
/// ```dart
/// MyRoute(
///   transitionDuration: handle.duration(),
///   reverseTransitionDuration: handle.reverseDuration(),
///   transitionsBuilder: handle.transitionsBuilder(fallback: myDefault),
///   ...
/// )
/// ```
extension FusePageRouteOptions on FusePageHandle {
  /// `duration` in ms.
  Duration duration([Duration fallback = const Duration(milliseconds: 300)]) {
    final ms = node.int('duration');
    return ms == null ? fallback : Duration(milliseconds: ms);
  }

  /// `reverseDuration` in ms, else [duration].
  Duration reverseDuration([Duration fallback = const Duration(milliseconds: 300)]) {
    final ms = node.int('reverseDuration');
    return ms == null ? duration(fallback) : Duration(milliseconds: ms);
  }

  /// `barrierColor`: what covers the page below while this one is up.
  Color? get barrierColor => node.value<Color>('barrierColor');

  /// `barrierDismissible`: a tap on the barrier pops the page.
  bool get barrierDismissible => node.bool('barrierDismissible') ?? false;

  String? get barrierLabel => node.string('barrierLabel');

  /// The route's transition: JS's `transition` function when it gave one,
  /// else [fallback]. JS builds its wrapper once per route, with the route's
  /// animations as handles; Flutter's transition widgets (`FadeTransition`,
  /// `SlideTransition`...) then follow them in Dart, frame by frame.
  RouteTransitionsBuilder transitionsBuilder({required RouteTransitionsBuilder fallback}) {
    final build = node['transition'] == true ? decFnBuild(node, true, 'transition') : null;
    if (build == null) return fallback;
    Widget? wrapper;
    return (context, animation, secondaryAnimation, child) {
      wrapper ??= fuseWidget(build(FuseCallArgs([
        node.registry.lendAs(animation, 'flutter_Animation'),
        node.registry.lendAs(secondaryAnimation, 'flutter_Animation'),
      ])));
      return FuseRouteChild(page: child, child: wrapper!);
    };
  }
}

/// Where a JS transition puts the page: `<routeChild>` shows [page].
class FuseRouteChild extends InheritedWidget {
  const FuseRouteChild({super.key, required this.page, required super.child});

  final Widget page;

  static Widget of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<FuseRouteChild>()?.page ?? const SizedBox.shrink();

  @override
  bool updateShouldNotify(FuseRouteChild old) => !identical(page, old.page);
}

/// `<routeChild>`: the page inside its JS transition.
class FuseRouteChildWidget extends StatelessWidget {
  const FuseRouteChildWidget(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) => FuseRouteChild.of(context);
}
