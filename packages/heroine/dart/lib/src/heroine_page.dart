import 'package:flutter/widgets.dart';
import 'package:heroine/heroine.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `heroinePage()`: a page whose route is a [HeroinePageRoute], so a
/// `DragDismissable` in it can drag it away and `ReactToHeroineDismiss`
/// sees the drag. It is see-through and fades in; the heroines fly.
class FuseHeroinePage extends FusePageHandle {
  FuseHeroinePage(super.node);

  @override
  late final Page<dynamic> object = _HeroinePage(this);
}

class _HeroinePage extends Page<dynamic> {
  _HeroinePage(this.handle) : super(key: handle.pageKey, name: handle.node.string('name'));

  final FuseHeroinePage handle;

  @override
  Route<dynamic> createRoute(BuildContext context) {
    final node = handle.node;
    final duration = Duration(milliseconds: node.int('duration') ?? 300);
    return _HeroineRoute<dynamic>(
      settings: this,
      maintainState: node.bool('maintainState') ?? true,
      fullscreenDialog: node.bool('fullscreenDialog') ?? false,
      transitionDuration: duration,
      reverseTransitionDuration: duration,
      pageBuilder: (_, _, _) => handle.pageContent,
      transitionsBuilder: (_, animation, _, child) => FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic),
        child: child,
      ),
    );
  }
}

class _HeroineRoute<T> extends PageRouteBuilder<T> with HeroinePageRouteMixin<T> {
  _HeroineRoute({
    super.settings,
    required super.pageBuilder,
    required super.transitionsBuilder,
    super.transitionDuration,
    super.reverseTransitionDuration,
    super.maintainState,
    super.fullscreenDialog,
  });
}
