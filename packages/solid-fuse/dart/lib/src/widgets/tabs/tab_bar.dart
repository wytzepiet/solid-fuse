import 'package:flutter/material.dart';

import '../../node.dart';
import '../text.dart';

/// The strip of tabs. Maps to Flutter's [TabBar].
///
/// With an explicit `controller` it drives that shared [TabController];
/// without one it resolves `DefaultTabController.of(context)` — so a
/// `<TabBar>` under a `<DefaultTabController>` just works, no wiring.
class FuseTabBar extends StatelessWidget {
  const FuseTabBar(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final controller = node.handle<TabController>('controller');
    final onTap = node.callback('onTap');

    final indicatorSize = switch (node.string('indicatorSize')) {
      'label' => TabBarIndicatorSize.label,
      'tab' => TabBarIndicatorSize.tab,
      _ => null,
    };

    final labelStyle = node.map('labelStyle');
    final unselectedLabelStyle = node.map('unselectedLabelStyle');
    final overlayColor = node.color('overlayColor');

    return TabBar(
      controller: controller,
      isScrollable: node.bool('isScrollable') ?? false,
      indicatorColor: node.color('indicatorColor'),
      indicatorWeight: node.double('indicatorWeight') ?? 2.0,
      indicatorSize: indicatorSize,
      indicator: node.boxDecoration('indicator'),
      indicatorPadding: node.edgeInsets('indicatorPadding') ?? EdgeInsets.zero,
      indicatorAnimation: _indicatorAnimation(node.string('indicatorAnimation')),
      labelColor: node.color('labelColor'),
      unselectedLabelColor: node.color('unselectedLabelColor'),
      labelStyle: labelStyle == null ? null : buildTextStyle(labelStyle),
      unselectedLabelStyle:
          unselectedLabelStyle == null ? null : buildTextStyle(unselectedLabelStyle),
      labelPadding: node.edgeInsets('labelPadding'),
      dividerColor: node.color('dividerColor'),
      dividerHeight: node.double('dividerHeight'),
      padding: node.edgeInsets('padding'),
      tabAlignment: _tabAlignment(node.string('tabAlignment')),
      // overlayColor drives the hover/focus/press ink. A transparent colour
      // makes the ink invisible without changing the splash geometry.
      overlayColor:
          overlayColor == null ? null : WidgetStatePropertyAll(overlayColor),
      splashFactory: _splashFactory(node.string('splashFactory')),
      mouseCursor: _mouseCursor(node.string('mouseCursor')),
      enableFeedback: node.bool('enableFeedback'),
      automaticIndicatorColorAdjustment:
          node.bool('automaticIndicatorColorAdjustment') ?? true,
      physics: _physics(node.string('physics')),
      onTap: onTap == null ? null : (i) => onTap(i),
      tabs: node.childWidgets,
    );
  }
}

TabIndicatorAnimation? _indicatorAnimation(String? value) {
  return switch (value) {
    'linear' => TabIndicatorAnimation.linear,
    'elastic' => TabIndicatorAnimation.elastic,
    _ => null,
  };
}

TabAlignment? _tabAlignment(String? value) {
  return switch (value) {
    'start' => TabAlignment.start,
    'startOffset' => TabAlignment.startOffset,
    'fill' => TabAlignment.fill,
    'center' => TabAlignment.center,
    _ => null,
  };
}

/// Bridges a string enum to Flutter's real [InteractiveInkFeatureFactory]s.
/// `"noSplash"` removes the splash entirely; the rest pick a concrete factory.
/// A null value leaves it to the theme default (Material's ink splash).
InteractiveInkFeatureFactory? _splashFactory(String? value) {
  return switch (value) {
    'noSplash' => NoSplash.splashFactory,
    'inkRipple' => InkRipple.splashFactory,
    'inkSparkle' => InkSparkle.splashFactory,
    'inkSplash' => InkSplash.splashFactory,
    'ink' => null,
    _ => null,
  };
}

MouseCursor? _mouseCursor(String? value) {
  return switch (value) {
    'click' => SystemMouseCursors.click,
    'basic' => SystemMouseCursors.basic,
    'forbidden' => SystemMouseCursors.forbidden,
    'grab' => SystemMouseCursors.grab,
    'text' => SystemMouseCursors.text,
    'none' => SystemMouseCursors.none,
    _ => null,
  };
}

ScrollPhysics? _physics(String? value) {
  return switch (value) {
    'bouncing' => const BouncingScrollPhysics(),
    'clamping' => const ClampingScrollPhysics(),
    'always' => const AlwaysScrollableScrollPhysics(),
    'never' => const NeverScrollableScrollPhysics(),
    'page' => const PageScrollPhysics(),
    _ => null,
  };
}
