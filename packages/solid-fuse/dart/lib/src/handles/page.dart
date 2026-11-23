import 'package:flutter/widgets.dart';

import '../fuse_page_handle.dart';

/// `<page>`: core's design-free page. Its route slides in from the right
/// (`transition: "slide"`, the default), fades (`"fade"`), or just appears
/// (`"none"`). The content brings its own background.
class FusePage extends FusePageHandle {
  FusePage(super.node);

  @override
  late final Page<dynamic> object = _FusePageImpl(this);
}

class _FusePageImpl extends Page<dynamic> {
  _FusePageImpl(this.handle) : super(key: handle.pageKey, name: handle.node.string('name'));

  final FusePage handle;

  @override
  Route<dynamic> createRoute(BuildContext context) {
    final node = handle.node;
    final transition = node.string('transition') ?? 'slide';
    final duration = transition == 'none' ? Duration.zero : Duration(milliseconds: node.int('duration') ?? 300);
    return PageRouteBuilder<dynamic>(
      settings: this,
      maintainState: node.bool('maintainState') ?? true,
      fullscreenDialog: node.bool('fullscreenDialog') ?? false,
      opaque: node.bool('opaque') ?? true,
      transitionDuration: duration,
      reverseTransitionDuration: duration,
      pageBuilder: (_, _, _) => handle.pageContent,
      transitionsBuilder: (_, animation, secondary, child) {
        final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);
        return switch (transition) {
          'fade' => FadeTransition(opacity: curved, child: child),
          'none' => child,
          _ => SlideTransition(
              position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(curved),
              child: SlideTransition(
                position: Tween(begin: Offset.zero, end: const Offset(-0.3, 0))
                    .animate(CurvedAnimation(parent: secondary, curve: Curves.easeOutCubic)),
                child: child,
              ),
            ),
        };
      },
    );
  }
}
