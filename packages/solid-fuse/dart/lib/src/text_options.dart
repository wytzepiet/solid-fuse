import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'node.dart';

/// Readers for the text input props core's `textInput` and the design
/// packages' text fields share (src/widgets/text-input.tsx has the types).

TextInputType fuseKeyboardType(String? value) => switch (value) {
      'number' => const TextInputType.numberWithOptions(decimal: true),
      'integer' => TextInputType.number,
      'email' => TextInputType.emailAddress,
      'phone' => TextInputType.phone,
      'url' => TextInputType.url,
      'multiline' => TextInputType.multiline,
      'name' => TextInputType.name,
      'none' => TextInputType.none,
      _ => TextInputType.text,
    };

TextInputAction? fuseInputAction(String? value) => switch (value) {
      'done' => TextInputAction.done,
      'next' => TextInputAction.next,
      'previous' => TextInputAction.previous,
      'send' => TextInputAction.send,
      'search' => TextInputAction.search,
      'go' => TextInputAction.go,
      'newline' => TextInputAction.newline,
      _ => null,
    };

TextCapitalization fuseTextCapitalization(String? value) => switch (value) {
      'words' => TextCapitalization.words,
      'sentences' => TextCapitalization.sentences,
      'characters' => TextCapitalization.characters,
      _ => TextCapitalization.none,
    };

TextAlign fuseTextAlign(String? value) => switch (value) {
      'left' => TextAlign.left,
      'right' => TextAlign.right,
      'center' => TextAlign.center,
      'justify' => TextAlign.justify,
      'end' => TextAlign.end,
      _ => TextAlign.start,
    };

Brightness? fuseBrightness(String? value) => switch (value) {
      'light' => Brightness.light,
      'dark' => Brightness.dark,
      _ => null,
    };

/// The text style props (`fontSize`, `fontWeight`, `fontFamily`,
/// `fontStyle`, `color`, `letterSpacing`, `lineHeight`), unset ones null so
/// a theme's style fills them.
TextStyle fuseTextStyle(FuseMap node) => TextStyle(
      fontFamily: node.string('fontFamily'),
      fontSize: node.double('fontSize'),
      fontWeight: node.fontWeight('fontWeight'),
      fontStyle: node.string('fontStyle') == 'italic' ? FontStyle.italic : null,
      color: node.color('color'),
      letterSpacing: node.double('letterSpacing'),
      height: node.double('lineHeight'),
    );

/// `maxLength`, `allowPattern` and `denyPattern` as formatters.
List<TextInputFormatter>? fuseInputFormatters(FuseNode node, {bool maxLength = true}) {
  final list = <TextInputFormatter>[];
  final max = node.int('maxLength');
  if (maxLength && max != null) list.add(LengthLimitingTextInputFormatter(max));
  try {
    final allow = node.string('allowPattern');
    final deny = node.string('denyPattern');
    if (allow != null) list.add(FilteringTextInputFormatter.allow(RegExp(allow)));
    if (deny != null) list.add(FilteringTextInputFormatter.deny(RegExp(deny)));
  } on FormatException catch (e) {
    debugPrint('[Fuse] invalid allowPattern/denyPattern: $e');
  }
  return list.isEmpty ? null : list;
}

/// Lines: `multiline` keyboards and `maxLines={0}` grow without limit.
int? fuseMaxLines(FuseNode node) {
  final max = node.int('maxLines');
  if (max == 0) return null;
  return max ?? (node.string('keyboardType') == 'multiline' ? null : 1);
}
