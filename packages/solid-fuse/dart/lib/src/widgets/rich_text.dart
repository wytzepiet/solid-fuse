import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../node.dart';
import '../node_widget.dart';
import 'text.dart';

/// `Text.rich` host: flows a mix of styled/tappable text runs (`<textSpan>`)
/// and inline widgets (any other child → `WidgetSpan`) as one wrapping block.
///
/// Not registered as its own wire tag — [FuseText] delegates here when a `<text>`
/// node has any non-text child, so a plain label keeps the cheap stateless path.
///
/// Stateful so it can own the lifecycle of the [GestureRecognizer]s created for
/// tappable spans — they must be disposed on rebuild and teardown.
class FuseRichText extends StatefulWidget {
  const FuseRichText(this.node);

  final FuseNode node;

  @override
  State<FuseRichText> createState() => _FuseRichTextState();
}

class _FuseRichTextState extends State<FuseRichText> {
  final List<GestureRecognizer> _recognizers = [];

  void _disposeRecognizers() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    // Recognizers from the previous build are about to be replaced; dispose them
    // so they don't leak (this is why FuseRichText is stateful).
    _disposeRecognizers();

    final textScaler = node.double('textScaler');

    // Pass nullable layout props so an unset one inherits from DefaultTextStyle /
    // ambient Directionality, exactly like the plain Text fast path in FuseText.
    return Text.rich(
      buildRootSpan(node, _recognizers),
      textAlign: parseTextAlign(node.string('textAlign')),
      textDirection: parseTextDirection(node.string('textDirection')),
      maxLines: node.int('maxLines'),
      overflow: parseTextOverflow(node.string('overflow')),
      softWrap: node.bool('softWrap'),
      locale: parseLocale(node.string('locale')),
      textScaler: textScaler != null ? TextScaler.linear(textScaler) : null,
    );
  }
}

/// Builds the root [TextSpan] for a `<richText>` node: the root style applies to
/// the whole block, and each child maps to an [InlineSpan]. Bare string children
/// become text in the root style.
///
/// Any [TapGestureRecognizer]s created for tappable spans are appended to
/// [recognizers] so the caller can dispose them.
TextSpan buildRootSpan(FuseNode node, List<GestureRecognizer> recognizers) {
  return TextSpan(
    style: buildTextStyle(node),
    children: _buildSpans(node, recognizers),
  );
}

List<InlineSpan> _buildSpans(FuseNode node, List<GestureRecognizer> recognizers) {
  final spans = <InlineSpan>[];
  for (final child in node.children) {
    switch (child.type) {
      case '__text__':
        spans.add(TextSpan(text: child.props['text']?.toString() ?? ''));
      case 'textSpan':
        spans.add(_buildTextSpan(child, recognizers));
      default:
        // Any non-textSpan node flows inline as a placeholder. FuseNodeWidget is
        // transparent, so embedding app widgets here works just like slivers.
        spans.add(
          WidgetSpan(
            child: FuseNodeWidget(node: child),
            alignment: _parsePlaceholderAlignment(child.string('alignment')),
            baseline: TextBaseline.alphabetic,
          ),
        );
    }
  }
  return spans;
}

TextSpan _buildTextSpan(FuseNode node, List<GestureRecognizer> recognizers) {
  TapGestureRecognizer? recognizer;
  final onTap = node.callback('onTap');
  if (onTap != null) {
    recognizer = TapGestureRecognizer()..onTap = () => onTap();
    recognizers.add(recognizer);
  }

  final style = buildTextStyle(node);

  // A span carrying its own text is where its recognizer attaches — Flutter does
  // not propagate a recognizer to child spans. So when this span has no nested
  // `<textSpan>`/widget children, its (flattened) text lives directly on it. When
  // it does have element children, recurse so nested styles/taps survive.
  final hasElementChildren = node.children.any((c) => c.type != '__text__');
  if (!hasElementChildren) {
    return TextSpan(text: extractText(node), style: style, recognizer: recognizer);
  }

  final buf = StringBuffer();
  final children = <InlineSpan>[];
  for (final child in node.children) {
    if (child.type == '__text__') {
      buf.write(child.props['text']?.toString() ?? '');
    } else if (child.type == 'textSpan') {
      children.add(_buildTextSpan(child, recognizers));
    } else {
      children.add(
        WidgetSpan(
          child: FuseNodeWidget(node: child),
          alignment: _parsePlaceholderAlignment(child.string('alignment')),
          baseline: TextBaseline.alphabetic,
        ),
      );
    }
  }
  return TextSpan(
    text: buf.isEmpty ? null : buf.toString(),
    style: style,
    recognizer: recognizer,
    children: children,
  );
}

PlaceholderAlignment _parsePlaceholderAlignment(String? value) {
  return switch (value) {
    'baseline' => PlaceholderAlignment.baseline,
    'aboveBaseline' => PlaceholderAlignment.aboveBaseline,
    'belowBaseline' => PlaceholderAlignment.belowBaseline,
    'top' => PlaceholderAlignment.top,
    'bottom' => PlaceholderAlignment.bottom,
    'middle' => PlaceholderAlignment.middle,
    _ => PlaceholderAlignment.middle,
  };
}

/// `<textSpan>` is a marker node interpreted by [FuseRichText] — it never renders
/// standalone. Registering it keeps the renderer happy if one is created outside
/// a `<richText>`; in that case it asserts in debug and renders nothing.
class FuseTextSpanMarker extends StatelessWidget {
  const FuseTextSpanMarker(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    assert(
      false,
      '<textSpan> is only valid as a child of <RichText>; it cannot render on its own.',
    );
    return const SizedBox.shrink();
  }
}
