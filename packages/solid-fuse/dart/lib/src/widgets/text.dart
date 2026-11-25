import 'package:flutter/widgets.dart';

import '../node.dart';
import '../node_widget.dart';
import 'app.dart' show fuseLocale;

/// `<Text>`: a Flutter [Text]. A `<Text>` inside it is a [TextSpan] with
/// its own style over the outer one, and any other element inside it sits in
/// the line as a [WidgetSpan].
class FuseText extends StatefulWidget {
  const FuseText(this.node);

  final FuseNode node;

  @override
  State<FuseText> createState() => _FuseTextState();
}

class _FuseTextState extends State<FuseText> {
  // The nested `<Text>`s: their props and children are part of this paragraph,
  // so this rebuilds when one of them changes.
  List<FuseNode> _spans = const [];

  void _changed() => setState(() {});

  void _listen(List<FuseNode> spans) {
    if (_sameNodes(spans, _spans)) return;
    for (final n in _spans) {
      n.removeListener(_changed);
    }
    for (final n in spans) {
      n.addListener(_changed);
    }
    _spans = spans;
  }

  @override
  void dispose() {
    for (final n in _spans) {
      n.removeListener(_changed);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final spans = <FuseNode>[];
    _collectSpans(node, spans);
    _listen(spans);

    final textAlign = node.enumOf('textAlign', TextAlign.values);
    final maxLines = node.int('maxLines');
    final overflow = node.enumOf('overflow', TextOverflow.values);
    final softWrap = node.props['softWrap'] as bool?;
    final locale = fuseLocale(node.string('locale'));
    final textDirection = node.enumOf('textDirection', TextDirection.values);
    final style = _style(node);

    if (spans.isEmpty && node.children.every((c) => c.type == '__text__')) {
      return Text(
        _extractText(node),
        textAlign: textAlign,
        textDirection: textDirection,
        maxLines: maxLines,
        overflow: overflow,
        softWrap: softWrap,
        locale: locale,
        style: style,
      );
    }
    return Text.rich(
      TextSpan(children: _children(node)),
      textAlign: textAlign,
      textDirection: textDirection,
      maxLines: maxLines,
      overflow: overflow,
      softWrap: softWrap,
      locale: locale,
      style: style,
    );
  }
}

/// The style a `<Text>` sets; what it leaves out comes from the text around it.
TextStyle _style(FuseNode node) => TextStyle(
      fontFamily: node.string('fontFamily'),
      fontSize: node.double('fontSize'),
      fontWeight: node.value<FontWeight>('fontWeight'),
      fontStyle: node.enumOf('fontStyle', FontStyle.values),
      color: node.value<Color>('color'),
      height: node.double('lineHeight'),
      letterSpacing: node.double('letterSpacing'),
      wordSpacing: node.double('wordSpacing'),
      decoration: node.value<TextDecoration>('textDecoration'),
      decorationColor: node.value<Color>('textDecorationColor'),
      decorationStyle: node.enumOf('textDecorationStyle', TextDecorationStyle.values),
      backgroundColor: node.value<Color>('backgroundColor'),
      shadows: node.values<Shadow>('shadows'),
    );

List<InlineSpan> _children(FuseNode node) => [
      for (final child in node.children)
        if (child.type == '__text__')
          TextSpan(text: child.props['text'] as String? ?? '')
        else if (child.type == 'text')
          TextSpan(style: _style(child), children: _children(child))
        else
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: FuseNodeWidget(node: child),
          ),
    ];

void _collectSpans(FuseNode node, List<FuseNode> out) {
  for (final child in node.children) {
    if (child.type == 'text') {
      out.add(child);
      _collectSpans(child, out);
    }
  }
}

bool _sameNodes(List<FuseNode> a, List<FuseNode> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!identical(a[i], b[i])) return false;
  }
  return true;
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
