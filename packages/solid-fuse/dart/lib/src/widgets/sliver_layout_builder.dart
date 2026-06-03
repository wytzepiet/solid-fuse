import 'package:flutter/widgets.dart';

import '../node.dart';
import 'sliver_support.dart';

/// A `<sliverLayoutBuilder>` — a [SliverLayoutBuilder] driven by the
/// builder/signal pattern.
///
/// On every layout pass the builder pushes the live [SliverConstraints] to JS
/// via the `onConstraints` callback; the JS wrapper feeds those into its
/// builder and renders the resulting sliver reactively into this node, which is
/// read back through [onlyChild]. One-frame lag is expected.
class FuseSliverLayoutBuilder extends StatelessWidget {
  const FuseSliverLayoutBuilder(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return SliverLayoutBuilder(
      builder: (context, constraints) {
        node.callback('onConstraints')?.call({
          'crossAxisExtent': constraints.crossAxisExtent,
          'scrollOffset': constraints.scrollOffset,
          'remainingPaintExtent': constraints.remainingPaintExtent,
          'viewportMainAxisExtent': constraints.viewportMainAxisExtent,
          'precedingScrollExtent': constraints.precedingScrollExtent,
          'overlap': constraints.overlap,
          'axisDirection': constraints.axisDirection.name,
          'growthDirection': constraints.growthDirection.name,
          'userScrollDirection': constraints.userScrollDirection.name,
        });
        return onlyChild(node) ??
            const SliverToBoxAdapter(child: SizedBox());
      },
    );
  }
}
