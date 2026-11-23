import 'package:flutter/widgets.dart';

import '../node.dart';

/// `<expandable header={...} expanded>`: Flutter's [Expansible]. Tapping the
/// header toggles the body (the children), animated; JS hears
/// `onExpandedChange`, and `expanded` from JS opens or closes it.
class FuseExpandable extends StatefulWidget {
  const FuseExpandable(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseExpandable> createState() => _FuseExpandableState();
}

class _FuseExpandableState extends State<FuseExpandable> {
  final _controller = ExpansibleController();

  FuseNode get node => widget.node;

  bool get _wanted => node.bool('expanded') ?? node.bool('defaultExpanded') ?? false;

  @override
  void initState() {
    super.initState();
    if (_wanted) _controller.expand();
    _controller.addListener(_changed);
  }

  void _changed() {
    if (_controller.isExpanded != (node.bool('expanded') ?? !_controller.isExpanded)) {
      node.callback('onExpandedChange')?.call(_controller.isExpanded);
    }
  }

  @override
  void didUpdateWidget(covariant FuseExpandable oldWidget) {
    super.didUpdateWidget(oldWidget);
    final want = node.bool('expanded');
    if (want == null || want == _controller.isExpanded) return;
    want ? _controller.expand() : _controller.collapse();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() => _controller.isExpanded ? _controller.collapse() : _controller.expand();

  @override
  Widget build(BuildContext context) {
    final disabled = node.bool('disabled') ?? false;
    return Expansible(
      controller: _controller,
      maintainState: node.bool('maintainState') ?? true,
      animationStyle: AnimationStyle(
        duration: Duration(milliseconds: node.int('duration') ?? 200),
        curve: Curves.easeInOut,
      ),
      headerBuilder: (context, _) => Semantics(
        button: true,
        expanded: _controller.isExpanded,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: disabled ? null : _toggle,
          child: node.widget('header') ?? const SizedBox.shrink(),
        ),
      ),
      bodyBuilder: (context, _) => node.flexChildren,
    );
  }
}
