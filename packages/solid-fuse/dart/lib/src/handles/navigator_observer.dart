import 'package:flutter/widgets.dart';

import '../fuse_handle.dart';

/// A [FuseHandle] whose wrapped [object] is a Flutter [NavigatorObserver].
///
/// Core stays observer-agnostic: it only knows "a handle can supply a
/// [NavigatorObserver]." A package wraps its observer in one of these and
/// registers it, so consuming apps pass the JS handle to `<Navigator
/// observers={[...]}>` with no Dart edits:
///
/// ```dart
/// void register(FuseRuntime runtime) {
///   runtime.registerHandle(
///     'heroineController',
///     (node) => FuseNavigatorObserverHandle(node, HeroineController()),
///   );
/// }
/// ```
///
/// `FuseNavigatorWidget` reads the Navigator's `observers` prop, resolves each
/// referenced handle's [object], and feeds them to `Navigator(observers:)`.
class FuseNavigatorObserverHandle extends FuseHandle<NavigatorObserver> {
  FuseNavigatorObserverHandle(super.node, this.object);

  @override
  final NavigatorObserver object;
}
