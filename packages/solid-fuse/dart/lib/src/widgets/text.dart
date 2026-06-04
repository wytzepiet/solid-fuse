import 'package:flutter/material.dart';

import '../node.dart';
import '../utils.dart';

class FuseText extends StatelessWidget {
  const FuseText(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return Text(
      extractText(node),
      textAlign: parseTextAlign(node.string('textAlign')),
      textDirection: _parseTextDirection(node.string('textDirection')),
      maxLines: node.int('maxLines'),
      overflow: parseTextOverflow(node.string('overflow')),
      softWrap: node.props['softWrap'] as bool?,
      locale: _parseLocale(node.string('locale')),
      style: buildTextStyle(node),
    );
  }
}

/// Builds a [TextStyle] from a node's style props. Shared by [FuseText] and the
/// rich-text span builder so the two never drift on how a style is parsed.
TextStyle buildTextStyle(FuseNode node) {
  return TextStyle(
    fontFamily: node.string('fontFamily'),
    fontSize: node.double('fontSize'),
    fontWeight: node.fontWeight('fontWeight'),
    fontStyle: node.string('fontStyle') == 'italic' ? FontStyle.italic : null,
    color: node.color('color'),
    height: node.double('lineHeight'),
    letterSpacing: node.double('letterSpacing'),
    wordSpacing: node.double('wordSpacing'),
    decoration: _parseTextDecoration(node.string('textDecoration')),
    decorationColor: node.color('textDecorationColor'),
    decorationStyle: _parseTextDecorationStyle(node.string('textDecorationStyle')),
    backgroundColor: node.color('backgroundColor'),
    shadows: _parseShadows(node.props['shadows']),
  );
}

TextAlign? parseTextAlign(String? value) {
  return switch (value) {
    'left' => TextAlign.left,
    'right' => TextAlign.right,
    'center' => TextAlign.center,
    'justify' => TextAlign.justify,
    'start' => TextAlign.start,
    'end' => TextAlign.end,
    _ => null,
  };
}

TextOverflow? parseTextOverflow(String? value) {
  return switch (value) {
    'clip' => TextOverflow.clip,
    'fade' => TextOverflow.fade,
    'ellipsis' => TextOverflow.ellipsis,
    'visible' => TextOverflow.visible,
    _ => null,
  };
}

Locale? _parseLocale(String? value) {
  if (value == null) return null;
  final parts = value.split('-');
  if (parts.length >= 2) {
    return Locale(parts[0], parts[1]);
  }
  return Locale(parts[0]);
}

TextDecorationStyle? _parseTextDecorationStyle(String? value) {
  return switch (value) {
    'solid' => TextDecorationStyle.solid,
    'double' => TextDecorationStyle.double,
    'dotted' => TextDecorationStyle.dotted,
    'dashed' => TextDecorationStyle.dashed,
    'wavy' => TextDecorationStyle.wavy,
    _ => null,
  };
}

TextDecoration? _parseTextDecoration(String? value) {
  return switch (value) {
    'none' => TextDecoration.none,
    'underline' => TextDecoration.underline,
    'overline' => TextDecoration.overline,
    'lineThrough' => TextDecoration.lineThrough,
    _ => null,
  };
}

TextDirection? _parseTextDirection(String? value) {
  return switch (value) {
    'ltr' => TextDirection.ltr,
    'rtl' => TextDirection.rtl,
    _ => null,
  };
}

List<Shadow>? _parseShadows(dynamic value) {
  if (value is List) return value.map(_parseOneShadow).toList();
  if (value is Map) return [_parseOneShadow(value)];
  return null;
}

Shadow _parseOneShadow(dynamic value) {
  final map = Map<String, dynamic>.from(value as Map);
  return Shadow(
    color: parseColor(map['color']) ?? const Color(0x40000000),
    blurRadius: (map['blurRadius'] as num?)?.toDouble() ?? 0,
    offset: Offset(
      (map['offsetX'] as num?)?.toDouble() ?? 0,
      (map['offsetY'] as num?)?.toDouble() ?? 0,
    ),
  );
}

/// Flattens a node's text content by concatenating every descendant `__text__`
/// node. Shared by [FuseText] and the rich-text span builder.
String extractText(FuseNode node) {
  final buf = StringBuffer();
  for (final child in node.children) {
    if (child.type == '__text__') {
      buf.write(child.props['text'] ?? '');
    } else {
      buf.write(extractText(child));
    }
  }
  return buf.toString();
}
