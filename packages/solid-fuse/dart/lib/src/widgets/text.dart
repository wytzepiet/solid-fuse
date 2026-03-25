import 'package:flutter/material.dart';

import '../fuse_widget.dart';
import '../node.dart';
import '../utils.dart';

class FuseText extends FuseWidget {
  const FuseText({super.key, required super.node});

  @override
  Widget build(BuildContext context) {
    final fontSize = node.double('fontSize');
    final fontFamily = node.string('fontFamily');
    final fontWeight = _parseFontWeight(node.props['fontWeight']);
    final fontStyle = node.string('fontStyle') == 'italic'
        ? FontStyle.italic
        : null;
    final color = node.color('color');
    final lineHeight = node.double('lineHeight');
    final letterSpacing = node.double('letterSpacing');
    final wordSpacing = node.double('wordSpacing');
    final textAlign = _parseTextAlign(node.string('textAlign'));
    final maxLines = node.int('maxLines');
    final overflow = _parseOverflow(node.string('overflow'));
    final softWrap = node.props['softWrap'] as bool?;
    final textDecoration = _parseTextDecoration(node.string('textDecoration'));
    final textDecorationColor = node.color('textDecorationColor');
    final textDecorationStyle = _parseTextDecorationStyle(node.string('textDecorationStyle'));
    final backgroundColor = node.color('backgroundColor');
    final shadows = _parseShadows(node.props['shadows']);
    final locale = _parseLocale(node.string('locale'));

    final textContent = _extractText(node);
    return Text(
      textContent,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      softWrap: softWrap,
      locale: locale,
      style: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        color: color,
        height: lineHeight,
        letterSpacing: letterSpacing,
        wordSpacing: wordSpacing,
        decoration: textDecoration,
        decorationColor: textDecorationColor,
        decorationStyle: textDecorationStyle,
        backgroundColor: backgroundColor,
        shadows: shadows,
      ),
    );
  }
}

FontWeight? _parseFontWeight(Object? value) {
  if (value is num) {
    return switch (value.toInt()) {
      100 => FontWeight.w100,
      200 => FontWeight.w200,
      300 => FontWeight.w300,
      400 => FontWeight.w400,
      500 => FontWeight.w500,
      600 => FontWeight.w600,
      700 => FontWeight.w700,
      800 => FontWeight.w800,
      900 => FontWeight.w900,
      _ => null,
    };
  }
  if (value is String) {
    return switch (value) {
      'thin' => FontWeight.w100,
      'extraLight' => FontWeight.w200,
      'light' => FontWeight.w300,
      'regular' => FontWeight.w400,
      'medium' => FontWeight.w500,
      'semiBold' => FontWeight.w600,
      'bold' => FontWeight.w700,
      'extraBold' => FontWeight.w800,
      'black' => FontWeight.w900,
      _ => null,
    };
  }
  return null;
}

TextAlign? _parseTextAlign(String? value) {
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

TextOverflow? _parseOverflow(String? value) {
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

String _extractText(FuseNode node) {
  final buf = StringBuffer();
  for (final child in node.children) {
    if (child.type == '__text__') {
      buf.write(child.props['text'] ?? '');
    } else {
      buf.write(_extractText(child));
    }
  }
  return buf.toString();
}
