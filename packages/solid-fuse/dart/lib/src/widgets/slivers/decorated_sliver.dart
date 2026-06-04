import 'package:flutter/widgets.dart';

import '../../node.dart';
import 'sliver_support.dart';

class FuseDecoratedSliver extends StatelessWidget {
  const FuseDecoratedSliver(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final position = node.string('position') == 'foreground'
        ? DecorationPosition.foreground
        : DecorationPosition.background;

    return DecoratedSliver(
      decoration: node.boxDecoration('decoration') ?? const BoxDecoration(),
      position: position,
      sliver: onlyChild(node)!,
    );
  }
}
