import 'package:flutter/widgets.dart';

import '../node.dart';

/// `<radioGroup value onChange>`: Flutter's [RadioGroup]. The design
/// packages' radios inside it join it, as they do in Flutter; JS values
/// (strings, numbers, booleans) compare by value.
class FuseRadioGroup extends StatelessWidget {
  const FuseRadioGroup(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final onChange = node.callback('onChange');
    return RadioGroup<Object?>(
      groupValue: node['value'],
      onChanged: (v) => onChange?.call(v),
      child: node.layoutChildren,
    );
  }
}
