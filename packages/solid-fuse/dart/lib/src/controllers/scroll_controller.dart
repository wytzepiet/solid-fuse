import 'package:flutter/material.dart';

import '../fuse_controller.dart';
import '../node.dart';

class FuseScrollController extends FuseController<ScrollController> {
  FuseScrollController(super.node);

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
  Future<dynamic> call(
    ScrollController object,
    String method,
    dynamic value,
  ) async {
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
