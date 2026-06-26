import 'package:flutter/material.dart';

import '../fuse_handle.dart';
import '../node.dart';

class FusePageController extends FuseHandle<PageController> {
  FusePageController(FuseNode node)
    : object = PageController(
        initialPage: node.int('initialPage') ?? 0,
        keepPage: node.bool('keepPage') ?? true,
        viewportFraction: node.double('viewportFraction') ?? 1.0,
      ),
      super(node) {
    object.addListener(() {
      // `page` asserts unless a PageView is attached; guard with hasClients.
      if (object.hasClients) {
        node.callback('setPage')?.call(object.page);
      }
    });
  }

  @override
  final PageController object;

  @override
  Future<dynamic> call(String method, dynamic value) async {
    switch (method) {
      case 'animateToPage':
        final map = FuseMap.from(value)!;
        await object.animateToPage(
          map.int('page') ?? 0,
          duration: Duration(milliseconds: map.int('duration') ?? 300),
          curve: _curve(map),
        );
      case 'jumpToPage':
        object.jumpToPage((value as num).toInt());
      case 'nextPage':
        final map = FuseMap.from(value) ?? const FuseMap({});
        await object.nextPage(
          duration: Duration(milliseconds: map.int('duration') ?? 300),
          curve: _curve(map),
        );
      case 'previousPage':
        final map = FuseMap.from(value) ?? const FuseMap({});
        await object.previousPage(
          duration: Duration(milliseconds: map.int('duration') ?? 300),
          curve: _curve(map),
        );
      default:
        throw StateError('Unknown pageController method: $method');
    }
    return null;
  }

  /// Page nav defaults to easeInOut (like ScrollController.animateTo) rather
  /// than parseCurve's linear fallback.
  Curve _curve(FuseMap map) =>
      map.string('curve') != null ? map.curve('curve') : Curves.easeInOut;

  @override
  void dispose() => object.dispose();
}
