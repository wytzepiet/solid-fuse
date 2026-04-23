import 'node.dart';

/// A persistent Dart-side object that backs a non-widget FuseNode.
///
/// Handles own a wrapped [object] (a Flutter controller, a route, a
/// long-lived resource) for the lifetime of their node. Created once when
/// the node is created, disposed once when the node is removed.
///
/// Subclasses declare [object] as an abstract getter — either a plain
/// `final` initialized in the constructor (for handles that need listener
/// wiring at creation time) or `late final` for purely lazy resources.
abstract class FuseHandle<T extends Object?> {
  FuseHandle(this.node);

  final FuseNode node;

  /// The wrapped Dart object (e.g. a Flutter FocusNode, a Page, a Timer).
  T get object;

  /// Handle an imperative RPC call from JS. Return value flows back to the
  /// JS `handle.call(...)` promise.
  Future<dynamic> call(String method, dynamic value) async => null;

  /// Release any resources owned by this handle. Called when the node is
  /// removed from the registry.
  void dispose() {}
}

/// Thrown when a JS-side `handle.call(...)` reaches Dart after the node
/// has been disposed (or never existed). Surfaces as a rejected promise on
/// the JS side with a clean message rather than a leaky internal id.
class HandleDisposedError implements Exception {
  const HandleDisposedError();

  @override
  String toString() => 'Fuse handle was already disposed';
}
