import 'package:heroine/heroine.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// The handle backing `createHeroineController()`. Wraps a heroine
/// [HeroineController] (a Flutter `NavigatorObserver`) so it can be passed to
/// `<Navigator observers={[...]}>` from JS.
///
/// Extends [FuseNavigatorObserverHandle] (core's generic observer wrapper) to
/// also dispose the controller when the handle node is removed.
class FuseHeroineController extends FuseNavigatorObserverHandle {
  FuseHeroineController(FuseNode node) : super(node, HeroineController());

  @override
  void dispose() => (object as HeroineController).dispose();
}
