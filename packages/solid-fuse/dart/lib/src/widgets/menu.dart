import 'package:flutter/widgets.dart';

import '../node.dart';

/// `<menu open content={...}>`: Flutter's [RawMenuAnchor]. The children are
/// the anchor; while `open`, the `content` element shows in the overlay
/// below it (above it when there is no room). A tap outside, Escape, or
/// scrolling closes it and JS hears `onOpenChange(false)`.
class FuseMenu extends StatefulWidget {
  const FuseMenu(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseMenu> createState() => _FuseMenuState();
}

class _FuseMenuState extends State<FuseMenu> {
  final _controller = MenuController();

  FuseNode get node => widget.node;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  @override
  void didUpdateWidget(covariant FuseMenu oldWidget) {
    super.didUpdateWidget(oldWidget);
    _schedule();
  }

  void _schedule() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final open = node.bool('open') ?? false;
        if (open && !_controller.isOpen) _controller.open();
        if (!open && _controller.isOpen) _controller.close();
      });

  @override
  Widget build(BuildContext context) {
    final onOpenChange = node.callback('onOpenChange');
    return RawMenuAnchor(
      controller: _controller,
      consumeOutsideTaps: node.bool('consumeOutsideTaps') ?? true,
      onOpen: () {
        if (!(node.bool('open') ?? false)) onOpenChange?.call(true);
      },
      onClose: () {
        if (node.bool('open') ?? false) onOpenChange?.call(false);
      },
      overlayBuilder: (context, info) {
        final content = node.widget('content');
        if (content == null) return const SizedBox.shrink();
        final gap = node.double('offset') ?? 4;
        return CustomSingleChildLayout(
          delegate: _MenuLayout(info.anchorRect, gap, node.string('align') == 'end'),
          child: TapRegion(groupId: info.tapRegionGroupId, child: content),
        );
      },
      child: node.layoutChildren,
    );
  }
}

/// Below the anchor, start- or end-aligned with it; above it, or shifted,
/// where it would run off the overlay.
class _MenuLayout extends SingleChildLayoutDelegate {
  _MenuLayout(this.anchor, this.gap, this.alignEnd);

  final Rect anchor;
  final double gap;
  final bool alignEnd;

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) => constraints.loosen();

  @override
  Offset getPositionForChild(Size size, Size child) {
    var x = alignEnd ? anchor.right - child.width : anchor.left;
    x = x.clamp(0.0, (size.width - child.width).clamp(0.0, double.infinity));
    var y = anchor.bottom + gap;
    if (y + child.height > size.height && anchor.top - gap - child.height >= 0) {
      y = anchor.top - gap - child.height;
    }
    return Offset(x, y.clamp(0.0, (size.height - child.height).clamp(0.0, double.infinity)));
  }

  @override
  bool shouldRelayout(_MenuLayout old) => old.anchor != anchor || old.gap != gap || old.alignEnd != alignEnd;
}
