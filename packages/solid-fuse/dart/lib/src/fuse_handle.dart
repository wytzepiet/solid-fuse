import 'node.dart';

abstract class FuseHandle {
  FuseHandle(this.node);

  final FuseNode node;

  /// Push a state update to JS. The corresponding signal updates reactively.
  void setState(String name, dynamic value) {
    node.function('_state:$name')?.call(value);
  }

  void call(String method, dynamic value) {}

  void dispose() {}
}
