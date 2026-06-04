import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../fuse_handle.dart';
import '../node.dart';

/// Backs a JS `createTabController(...)`. Owns a real Flutter [TabController]
/// that a `<TabBar>` and `<TabBarView>` share by referencing this handle's
/// node, keeping the strip and the pages in sync.
///
/// A [TabController] needs a [TickerProvider] for its animation. Handles live
/// outside the widget tree (no `State`, no `vsync`), so this handle *is* the
/// ticker provider — `createTicker` returns a bare [Ticker], which the
/// scheduler drives like any other.
class FuseTabController extends FuseHandle<TabController>
    implements TickerProvider {
  FuseTabController(super.node) {
    object = TabController(
      length: node.int('length') ?? 0,
      initialIndex: node.int('initialIndex') ?? 0,
      vsync: this,
    );
    object.addListener(_handleChange);
  }

  @override
  late final TabController object;

  // Mirrors the last index pushed to JS so the two listener fires per change
  // (indexIsChanging toggling true then false) collapse into one update.
  int _lastIndex = -1;

  @override
  Ticker createTicker(TickerCallback onTick) => Ticker(onTick);

  void _handleChange() {
    if (object.index == _lastIndex) return;
    _lastIndex = object.index;
    node.callback('setIndex')?.call(object.index);
  }

  @override
  Future<dynamic> call(String method, dynamic value) async {
    switch (method) {
      case 'animateTo':
        final map = FuseMap.from(value)!;
        object.animateTo(
          map.int('index') ?? 0,
          duration: Duration(
            milliseconds:
                map.int('duration') ?? kTabScrollDuration.inMilliseconds,
          ),
          curve: Curves.ease,
        );
      case 'jumpTo':
        // Assigning index (rather than animateTo) switches with no animation.
        object.index = (value as num).toInt();
      default:
        throw StateError('Unknown tabController method: $method');
    }
    return null;
  }

  @override
  void dispose() => object.dispose();
}
