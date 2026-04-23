import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../node.dart';

class FuseTextField extends StatefulWidget {
  const FuseTextField(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseTextField> createState() => _FuseTextFieldState();
}

class _FuseTextFieldState extends State<FuseTextField> {
  late final TextEditingController _controller;
  String _lastAppliedValue = '';

  @override
  void initState() {
    super.initState();
    final initial = widget.node.string('value') ?? '';
    _controller = TextEditingController(text: initial);
    _lastAppliedValue = initial;
  }

  @override
  void didUpdateWidget(covariant FuseTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    final v = widget.node.string('value');
    if (v != null && v != _lastAppliedValue && v != _controller.text) {
      _controller.value = TextEditingValue(
        text: v,
        selection: TextSelection.collapsed(offset: v.length),
      );
    }
    _lastAppliedValue = v ?? _lastAppliedValue;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;

    final focusNode = node.handle<FocusNode>('focusNode');
    final formatters = _buildFormatters(node);
    final decoration = _buildDecoration(node);
    final onTapOutside = node.function('onTapOutside');

    return TextField(
      controller: _controller,
      focusNode: focusNode,
      autofocus: node.bool('autofocus') ?? false,
      enabled: node.bool('enabled'),
      readOnly: node.bool('readOnly') ?? false,
      obscureText: node.bool('obscureText') ?? false,
      obscuringCharacter: node.string('obscuringCharacter') ?? '•',
      autocorrect: node.bool('autocorrect') ?? true,
      enableSuggestions: node.bool('enableSuggestions') ?? true,
      spellCheckConfiguration: (node.bool('spellCheck') ?? false)
          ? SpellCheckConfiguration(spellCheckService: DefaultSpellCheckService())
          : null,
      smartDashesType: _smartDashes(node.string('smartDashesType')),
      smartQuotesType: _smartQuotes(node.string('smartQuotesType')),
      enableIMEPersonalizedLearning:
          node.bool('enableIMEPersonalizedLearning') ?? true,
      textCapitalization: _textCapitalization(node.string('textCapitalization')),
      autofillHints: node.list<String>('autofillHints'),
      keyboardAppearance: _brightness(node.string('keyboardAppearance')),
      keyboardType: _keyboardType(node.string('keyboardType')),
      textInputAction: _textInputAction(node.string('textInputAction')),
      maxLines: node.int('maxLines') ?? 1,
      minLines: node.int('minLines'),
      maxLength: node.int('maxLength'),
      expands: node.bool('expands') ?? false,
      textAlign: _textAlign(node.string('textAlign')),
      style: _textStyle(node),
      showCursor: node.bool('showCursor'),
      cursorColor: node.color('cursorColor'),
      cursorWidth: node.double('cursorWidth') ?? 2.0,
      cursorHeight: node.double('cursorHeight'),
      cursorRadius: _cursorRadius(node.double('cursorRadius')),
      scrollPadding: node.edgeInsets('scrollPadding') ?? const EdgeInsets.all(20),
      inputFormatters: formatters,
      decoration: decoration,
      onChanged: node.function('onChanged'),
      onSubmitted: node.function('onSubmitted'),
      onEditingComplete: node.function('onEditingComplete'),
      onTap: node.function('onTap'),
      onTapOutside: onTapOutside == null ? null : (_) => onTapOutside(),
    );
  }
}

// ─── Parsers ────────────────────────────────────────────────────────────────

List<TextInputFormatter>? _buildFormatters(FuseNode node) {
  final allow = node.string('allowPattern');
  final deny = node.string('denyPattern');
  if (allow == null && deny == null) return null;

  final list = <TextInputFormatter>[];
  try {
    if (allow != null) {
      list.add(FilteringTextInputFormatter.allow(RegExp(allow)));
    }
    if (deny != null) {
      list.add(FilteringTextInputFormatter.deny(RegExp(deny)));
    }
  } on FormatException catch (e) {
    debugPrint('[Fuse textField] invalid allow/denyPattern: $e');
    return null;
  }
  return list.isEmpty ? null : list;
}

TextStyle _textStyle(FuseNode node) {
  return TextStyle(
    fontFamily: node.string('fontFamily'),
    fontSize: node.double('fontSize'),
    fontWeight: node.fontWeight('fontWeight'),
    fontStyle: node.string('fontStyle') == 'italic' ? FontStyle.italic : null,
    color: node.color('color'),
    letterSpacing: node.double('letterSpacing'),
    height: node.double('height'),
    decoration: _textDecoration(node.string('textDecoration')),
    decorationColor: node.color('textDecorationColor'),
    decorationStyle: _textDecorationStyle(node.string('textDecorationStyle')),
  );
}

InputDecoration _buildDecoration(FuseNode node) {
  final dec = node.map('decoration');
  final hint = node.string('hintText') ?? node.string('placeholder');

  final border = _inputBorder(dec?.string('border'));
  final hintStyle = dec?.map('hintStyle');

  return InputDecoration(
    hintText: hint,
    hintStyle: hintStyle == null
        ? null
        : TextStyle(
            fontSize: hintStyle.double('fontSize'),
            color: hintStyle.color('color'),
            fontWeight: hintStyle.fontWeight('fontWeight'),
            fontFamily: hintStyle.string('fontFamily'),
          ),
    labelText: dec?.string('labelText'),
    helperText: dec?.string('helperText'),
    errorText: dec?.string('errorText'),
    floatingLabelBehavior: _floatingLabelBehavior(dec?.string('floatingLabelBehavior')),
    isDense: dec?.bool('isDense'),
    isCollapsed: dec?.bool('isCollapsed') ?? false,
    border: border,
    enabledBorder: border,
    focusedBorder: border,
    filled: dec?.bool('filled'),
    fillColor: dec?.color('fillColor'),
    contentPadding: dec?.edgeInsets('contentPadding'),
    prefixText: dec?.string('prefixText'),
    suffixText: dec?.string('suffixText'),
    prefixIcon: node.widget('prefixIcon'),
    suffixIcon: node.widget('suffixIcon'),
  );
}

InputBorder? _inputBorder(String? kind) {
  return switch (kind) {
    'none' => InputBorder.none,
    'outline' => const OutlineInputBorder(),
    'underline' => const UnderlineInputBorder(),
    _ => null,
  };
}

TextCapitalization _textCapitalization(String? value) {
  return switch (value) {
    'words' => TextCapitalization.words,
    'sentences' => TextCapitalization.sentences,
    'characters' => TextCapitalization.characters,
    _ => TextCapitalization.none,
  };
}

TextInputType _keyboardType(String? value) {
  return switch (value) {
    'number' => const TextInputType.numberWithOptions(decimal: true),
    'email' => TextInputType.emailAddress,
    'phone' => TextInputType.phone,
    'url' => TextInputType.url,
    'multiline' => TextInputType.multiline,
    _ => TextInputType.text,
  };
}

TextInputAction? _textInputAction(String? value) {
  return switch (value) {
    'done' => TextInputAction.done,
    'next' => TextInputAction.next,
    'send' => TextInputAction.send,
    'search' => TextInputAction.search,
    'go' => TextInputAction.go,
    'newline' => TextInputAction.newline,
    _ => null,
  };
}

TextAlign _textAlign(String? value) {
  return switch (value) {
    'right' => TextAlign.right,
    'center' => TextAlign.center,
    'justify' => TextAlign.justify,
    'start' => TextAlign.start,
    'end' => TextAlign.end,
    _ => TextAlign.left,
  };
}

TextDecoration? _textDecoration(String? value) {
  return switch (value) {
    'none' => TextDecoration.none,
    'underline' => TextDecoration.underline,
    'overline' => TextDecoration.overline,
    'lineThrough' => TextDecoration.lineThrough,
    _ => null,
  };
}

TextDecorationStyle? _textDecorationStyle(String? value) {
  return switch (value) {
    'solid' => TextDecorationStyle.solid,
    'double' => TextDecorationStyle.double,
    'dotted' => TextDecorationStyle.dotted,
    'dashed' => TextDecorationStyle.dashed,
    'wavy' => TextDecorationStyle.wavy,
    _ => null,
  };
}

Radius? _cursorRadius(double? value) =>
    value == null ? null : Radius.circular(value);

SmartDashesType? _smartDashes(String? value) {
  return switch (value) {
    'disabled' => SmartDashesType.disabled,
    'enabled' => SmartDashesType.enabled,
    _ => null,
  };
}

SmartQuotesType? _smartQuotes(String? value) {
  return switch (value) {
    'disabled' => SmartQuotesType.disabled,
    'enabled' => SmartQuotesType.enabled,
    _ => null,
  };
}

Brightness? _brightness(String? value) {
  return switch (value) {
    'light' => Brightness.light,
    'dark' => Brightness.dark,
    _ => null,
  };
}

FloatingLabelBehavior? _floatingLabelBehavior(String? value) {
  return switch (value) {
    'auto' => FloatingLabelBehavior.auto,
    'always' => FloatingLabelBehavior.always,
    'never' => FloatingLabelBehavior.never,
    _ => null,
  };
}
