import 'package:flutter/widgets.dart';

import '../../node.dart';
import 'sliver_support.dart';

class FuseSliverAnimatedOpacity extends StatelessWidget {
  const FuseSliverAnimatedOpacity(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final onEnd = node.callback('onEnd');

    return SliverAnimatedOpacity(
      opacity: node.double('opacity') ?? 1.0,
      duration: Duration(milliseconds: node.int('duration') ?? 300),
      curve: node.curve('curve'),
      alwaysIncludeSemantics: node.bool('alwaysIncludeSemantics') ?? false,
      onEnd: onEnd == null ? null : () => onEnd(),
      sliver: onlyChild(node)!,
    );
  }
}
