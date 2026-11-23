import 'package:flutter/widgets.dart';

import 'node.dart';

/// The text of a text input whose `value` JS controls.
///
/// Dart owns the live text while the user types and reports each change to
/// `onChange`. A `value` from JS is applied unless it is an echo of a change
/// Dart already reported: the round trip through JS is async, so a value
/// can arrive after the user typed further, and applying it would move the
/// text (and the cursor) back. Any other value is a write from JS and wins.
/// Without `value` the input is uncontrolled and starts at `defaultValue`.
///
/// Used by core's `textInput` and by the design packages' text fields:
/// create it in `initState`, call [sync] in `didUpdateWidget`, [changed] from
/// the field's `onChanged`, and [dispose] with the state.
class FuseControlledText {
  FuseControlledText(this._node)
      : controller = TextEditingController(text: _node.string('value') ?? _node.string('defaultValue') ?? '');

  FuseNode _node;

  /// The field's controller.
  final TextEditingController controller;

  /// Changes reported to JS that it hasn't sent back yet, oldest first.
  final List<String> _sent = [];

  /// The user changed the text to [text]: report it to JS.
  void changed(String text) {
    _sent.add(text);
    if (_sent.length > 64) _sent.removeAt(0);
    _node.callback('onChange')?.call(text);
  }

  /// Apply the node's `value` if JS wrote one. [node] is the widget's
  /// current node (the same one, unless the field moved).
  void sync(FuseNode node) {
    _node = node;
    final v = node['value'];
    if (v is! String) return;
    if (v == controller.text) {
      _sent.clear();
      return;
    }
    final echo = _sent.indexOf(v);
    if (echo >= 0) {
      // An older change coming back; newer ones are still on their way.
      _sent.removeRange(0, echo + 1);
      return;
    }
    _sent.clear();
    final sel = controller.selection;
    controller.value = TextEditingValue(
      text: v,
      selection: sel.isValid && sel.end <= v.length ? sel : TextSelection.collapsed(offset: v.length),
    );
  }

  void dispose() => controller.dispose();
}
