import 'package:flutter/material.dart';

import '../fuse_handle.dart';
import '../node.dart';

class ScrollControllerHandle extends FuseHandle<ScrollController> {
  ScrollControllerHandle(super.node);

  @override
  ScrollController create() {
    final controller = ScrollController(
      initialScrollOffset: node.double('initialScrollOffset') ?? 0,
    );
    controller.addListener(() {
      setState('scrollOffset', controller.offset);
    });
    return controller;
  }

  @override
  void call(ScrollController object, String method, dynamic value) {
    switch (method) {
      case 'scrollTo':
        object.jumpTo((value as num).toDouble());
      case 'animateTo':
        final map = FuseMap.from(value)!;
        object.animateTo(
          map.double('offset') ?? 0,
          duration: Duration(milliseconds: map.int('duration') ?? 300),
          curve: Curves.easeInOut,
        );
      case 'jumpTo':
        object.jumpTo((value as num).toDouble());
    }
  }

  @override
  void dispose(ScrollController object) => object.dispose();
}
