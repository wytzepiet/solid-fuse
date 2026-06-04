import 'package:flutter/material.dart';

import '../../node.dart';

/// A single label in a [TabBar]. Maps to Flutter's [Tab].
///
/// `text` renders a plain label; any child JSX renders as the tab's `child`
/// (an icon + label, a custom widget). They're mutually exclusive, matching
/// Flutter's [Tab] constructor.
class FuseTab extends StatelessWidget {
  const FuseTab(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final text = node.string('text');
    final height = node.double('height');
    final children = node.childWidgets;

    final Widget? child = children.isEmpty
        ? null
        : children.length == 1
        ? children.first
        : Column(mainAxisSize: MainAxisSize.min, children: children);

    return Tab(
      height: height,
      // Tab asserts exactly one of text/child is set; fall back to an empty
      // box if a tab was given neither.
      text: child == null ? (text ?? '') : null,
      child: child,
    );
  }
}
