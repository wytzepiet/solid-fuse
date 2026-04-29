import 'package:flutter/material.dart';

import '../fuse_handle.dart';
import '../node.dart';

class FuseScrollController extends FuseHandle<ScrollController> {
  FuseScrollController(FuseNode node)
    : object = ScrollController(
        initialScrollOffset: node.double('initialScrollOffset') ?? 0,
      ),
      super(node) {
    object.addListener(
      () => node.callback('setScrollOffset')?.call(object.offset),
    );
  }

  @override
  final ScrollController object;

  @override
  Future<dynamic> call(String method, dynamic value) async {
    switch (method) {
      case 'animateTo':
        final map = FuseMap.from(value)!;
        object.animateTo(
          map.double('offset') ?? 0,
          duration: Duration(milliseconds: map.int('duration') ?? 300),
          curve: Curves.easeInOut,
        );
      case 'jumpTo':
        object.jumpTo((value as num).toDouble());
      default:
        throw StateError('Unknown scrollController method: $method');
    }
    return null;
  }

  @override
  void dispose() => object.dispose();
}
