import 'node.dart';

abstract class FuseHandle<T> {
  FuseHandle(this.node);

  final FuseNode node;

  /// Create the native Dart object (e.g. ScrollController).
  /// This is what gets stored on the node and exposed via `_ref` resolution.
  T create();

  /// Handle an imperative method call from JS.
  void call(T object, String method, dynamic value) {}

  /// Dispose the native object.
  void dispose(T object) {}

  /// Push a state update to JS. The corresponding signal updates reactively.
  void setState(String name, dynamic value) {
    node.function('_state:$name')?.call(value);
  }
}
