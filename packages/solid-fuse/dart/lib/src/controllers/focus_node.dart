import 'package:flutter/material.dart';

import '../fuse_controller.dart';

class FuseFocusNode extends FuseController<FocusNode> {
  FuseFocusNode(super.node);

  @override
  FocusNode create() {
    final focus = FocusNode();
    focus.addListener(() => setState('hasFocus', focus.hasFocus));
    return focus;
  }

  @override
  Future<dynamic> call(FocusNode object, String method, dynamic value) async {
    switch (method) {
      case 'focus':
        object.requestFocus();
      case 'unfocus':
        object.unfocus();
    }
    return null;
  }

  @override
  void dispose(FocusNode object) => object.dispose();
}
