import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `<cupertinoSegmentedControl values value onChange>`: a
/// [CupertinoSlidingSegmentedControl] whose segments are the children, one
/// per entry of `values` (strings, numbers, booleans; compared by value).
class FuseCupertinoSegmentedControl extends StatelessWidget {
  const FuseCupertinoSegmentedControl(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final values = node.list<Object?>('values') ?? const [];
    final kids = node.childWidgets;
    final disabled = node.list<Object?>('disabledValues') ?? const [];
    final onChange = node.callback('onChange');
    if (values.isEmpty) return const SizedBox.shrink();
    return CupertinoSlidingSegmentedControl<Object>(
      groupValue: node['value'],
      onValueChanged: (v) => onChange?.call(v),
      disabledChildren: {for (final d in disabled) ?d},
      thumbColor: node.color('thumbColor') ??
          const CupertinoDynamicColor.withBrightness(color: Color(0xFFFFFFFF), darkColor: Color(0xFF636366)),
      backgroundColor: node.color('backgroundColor') ?? CupertinoColors.tertiarySystemFill,
      proportionalWidth: node.bool('proportionalWidth') ?? false,
      children: {
        for (var i = 0; i < values.length && i < kids.length; i++)
          if (values[i] != null) values[i]!: kids[i],
      },
    );
  }
}
