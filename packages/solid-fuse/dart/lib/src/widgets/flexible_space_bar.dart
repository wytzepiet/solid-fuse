import 'package:flutter/material.dart';

import '../node.dart';

class FuseFlexibleSpaceBar extends StatelessWidget {
  const FuseFlexibleSpaceBar(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final collapseMode = switch (node.string('collapseMode')) {
      'none' => CollapseMode.none,
      'pin' => CollapseMode.pin,
      _ => CollapseMode.parallax,
    };

    final stretchModes = _stretchModes(node.list<String>('stretchModes'));

    return FlexibleSpaceBar(
      title: node.widget('title'),
      background: node.widget('background'),
      centerTitle: node.bool('centerTitle'),
      titlePadding: node.edgeInsets('titlePadding'),
      collapseMode: collapseMode,
      stretchModes: stretchModes,
      expandedTitleScale: node.double('expandedTitleScale') ?? 1.5,
    );
  }
}

List<StretchMode> _stretchModes(List<String>? values) {
  if (values == null) return const [StretchMode.zoomBackground];
  final modes = <StretchMode>[];
  for (final v in values) {
    switch (v) {
      case 'zoomBackground':
        modes.add(StretchMode.zoomBackground);
      case 'blurBackground':
        modes.add(StretchMode.blurBackground);
      case 'fadeTitle':
        modes.add(StretchMode.fadeTitle);
    }
  }
  return modes.isEmpty ? const [StretchMode.zoomBackground] : modes;
}
