import 'package:flutter/widgets.dart';

import '../node.dart';
import 'app.dart' show fuseLocale;

class FuseText extends StatelessWidget {
  const FuseText(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final fontSize = node.double('fontSize');
    final fontFamily = node.string('fontFamily');
    final fontWeight = node.value<FontWeight>('fontWeight');
    final fontStyle = node.enumOf('fontStyle', FontStyle.values);
    final color = node.value<Color>('color');
    final lineHeight = node.double('lineHeight');
    final letterSpacing = node.double('letterSpacing');
    final wordSpacing = node.double('wordSpacing');
    final textAlign = node.enumOf('textAlign', TextAlign.values);
    final maxLines = node.int('maxLines');
    final overflow = node.enumOf('overflow', TextOverflow.values);
    final softWrap = node.props['softWrap'] as bool?;
    final textDecoration = node.value<TextDecoration>('textDecoration');
    final textDecorationColor = node.value<Color>('textDecorationColor');
    final textDecorationStyle = node.enumOf('textDecorationStyle', TextDecorationStyle.values);
    final backgroundColor = node.value<Color>('backgroundColor');
    final shadows = node.values<Shadow>('shadows');
    final locale = fuseLocale(node.string('locale'));
    final textDirection = node.enumOf('textDirection', TextDirection.values);

    final textContent = _extractText(node);
    return Text(
      textContent,
      textAlign: textAlign,
      textDirection: textDirection,
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
