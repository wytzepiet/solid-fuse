import 'package:flutter/widgets.dart';

import '../node.dart';

/// `<tooltip content={...}>`: Flutter's [RawTooltip]. Shows the `content`
/// element near the children on hover or long press (`trigger`), faded in.
class FuseTooltip extends StatelessWidget {
  const FuseTooltip(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final content = node.widget('content');
    Duration ms(String key, int fallback) => Duration(milliseconds: node.int(key) ?? fallback);
    final onShow = node.callback('onShow');
    return RawTooltip(
      semanticsTooltip: node.string('label'),
      triggerMode: switch (node.string('trigger')) {
        'tap' => TooltipTriggerMode.tap,
        'manual' => TooltipTriggerMode.manual,
        _ => TooltipTriggerMode.longPress,
      },
      hoverDelay: ms('hoverDelay', 0),
      touchDelay: ms('touchDelay', 1500),
      dismissDelay: ms('dismissDelay', 100),
      onTriggered: onShow == null ? null : () => onShow(),
      tooltipBuilder: (context, animation) => content == null
          ? const SizedBox.shrink()
          : FadeTransition(opacity: animation, child: IgnorePointer(child: content)),
      child: node.layoutChildren,
    );
  }
}
