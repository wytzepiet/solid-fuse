import 'node.dart';

abstract class FuseHandle {
  FuseHandle(this.node);

  final FuseNode node;

  /// The native object to expose when this handle is passed as a widget prop
  /// via `_ref` resolution. Override to return the inner object (e.g. ScrollController).
  Object get nativeObject => this;

  /// Push a state update to JS. The corresponding signal updates reactively.
  void setState(String name, dynamic value) {
    node.function('_state:$name')?.call(value);
  }

  void call(String method, dynamic value) {}

  void dispose() {}
}
