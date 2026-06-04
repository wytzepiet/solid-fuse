import 'package:flutter/cupertino.dart';

import '../../node.dart';

class FuseCupertinoSliverNavigationBar extends StatelessWidget {
  const FuseCupertinoSliverNavigationBar(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final largeTitle = node.widget('largeTitle');
    final leading = node.widget('leading');
    final middle = node.widget('middle');
    final trailing = node.widget('trailing');

    // `bottom` is a PreferredSizeWidget slot (e.g. a search field or segmented
    // control under the large title); wrap the JSX node in a PreferredSize so
    // the nav bar knows its fully-extended height.
    final bottomNode = node.widget('bottom');
    final bottom = bottomNode == null
        ? null
        : PreferredSize(
            preferredSize: Size.fromHeight(node.double('bottomHeight') ?? 44),
            child: bottomNode,
          );

    final brightness = switch (node.string('brightness')) {
      'light' => Brightness.light,
      'dark' => Brightness.dark,
      _ => null,
    };

    // CupertinoSliverNavigationBar.padding is EdgeInsetsDirectional; our
    // EdgeInsetsInput is non-directional, so map left→start / right→end.
    final insets = node.edgeInsets('padding');
    final padding = insets == null
        ? null
        : EdgeInsetsDirectional.fromSTEB(
            insets.left,
            insets.top,
            insets.right,
            insets.bottom,
          );

    return CupertinoSliverNavigationBar(
      largeTitle: largeTitle,
      leading: leading,
      middle: middle,
      trailing: trailing,
      automaticallyImplyLeading:
          node.bool('automaticallyImplyLeading') ?? true,
      automaticallyImplyTitle: node.bool('automaticallyImplyTitle') ?? true,
      alwaysShowMiddle: node.bool('alwaysShowMiddle') ?? true,
      stretch: node.bool('stretch') ?? false,
      transitionBetweenRoutes: node.bool('transitionBetweenRoutes') ?? true,
      backgroundColor: node.color('backgroundColor'),
      border: node.border('border'),
      brightness: brightness,
      padding: padding,
      bottom: bottom,
    );
  }
}
