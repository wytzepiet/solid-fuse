import 'node.dart';

abstract class FuseController<T> {
  FuseController(this.node);

  final FuseNode node;

  /// Create the native Dart object (e.g. ScrollController).
  /// This is what gets stored on the node and exposed via `_ref` resolution.
  T create();

  /// Handle an imperative method call from JS. Return value flows back to
  /// the JS `controller.call(...)` promise.
  Future<dynamic> call(T object, String method, dynamic value) async => null;

  /// Dispose the native object.
  void dispose(T object) {}

  /// Push a state update to JS. The corresponding signal updates reactively.
  void setState(String name, dynamic value) {
    node.function('_state:$name')?.call(value);
  }
}
