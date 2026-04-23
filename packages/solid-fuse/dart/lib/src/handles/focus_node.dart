import 'package:flutter/material.dart';

import '../fuse_handle.dart';

class FuseFocusNode extends FuseHandle<FocusNode> {
  FuseFocusNode(super.node) : object = FocusNode() {
    object.addListener(
      () => node.function('setHasFocus')?.call(object.hasFocus),
    );
  }

  @override
  final FocusNode object;

  @override
  Future<dynamic> call(String method, dynamic value) async {
    switch (method) {
      case 'focus':
        object.requestFocus();
      case 'unfocus':
        object.unfocus();
      default:
        throw StateError('Unknown focusNode method: $method');
    }
    return null;
  }

  @override
  void dispose() => object.dispose();
}
