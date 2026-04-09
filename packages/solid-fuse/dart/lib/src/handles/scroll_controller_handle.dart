import 'package:flutter/material.dart';

import '../fuse_handle.dart';
import '../node.dart';

class ScrollControllerHandle extends FuseHandle {
  ScrollControllerHandle(super.node)
    : controller = ScrollController(
        initialScrollOffset: node.double('initialScrollOffset') ?? 0,
      ) {
    controller.addListener(() {
      setState('scrollOffset', controller.offset);
    });
  }

  final ScrollController controller;

  @override
  Object get nativeObject => controller;

  @override
  void call(String method, dynamic value) {
    switch (method) {
      case 'scrollTo':
        controller.jumpTo((value as num).toDouble());
      case 'animateTo':
        final map = FuseMap.from(value)!;
        controller.animateTo(
          map.double('offset') ?? 0,
          duration: Duration(milliseconds: map.int('duration') ?? 300),
          curve: Curves.easeInOut,
        );
      case 'jumpTo':
        controller.jumpTo((value as num).toDouble());
    }
  }

  @override
  void dispose() => controller.dispose();
}
