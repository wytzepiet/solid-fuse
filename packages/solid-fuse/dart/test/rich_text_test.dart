import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/src/node.dart';
import 'package:solid_fuse/src/widgets/rich_text.dart';

/// Minimal node factory mirroring what the runtime builds. Function props are
/// passed as `true` (the renderer's wire form for a registered callback).
class _Tree {
  _Tree()
    : registry = FuseNodeRegistry(
        callFunction: (id, name, [value]) => _calls.add('$id.$name'),
        callFunctionAsync: (id, name, [value]) async => null,
      );

  static final List<String> _calls = [];
  final FuseNodeRegistry registry;
  int _nextId = 1;

  FuseNode node(String type, [Map<String, dynamic>? props, List<FuseNode>? children]) {
    final n = registry.create(_nextId++, type, props ?? {});
    if (children != null) {
      for (var i = 0; i < children.length; i++) {
        n.insertChildSilent(i, children[i]);
      }
    }
    return n;
  }

  FuseNode text(String value) => node('__text__', {'text': value});
}

void main() {
  test('buildRootSpan maps children to the expected InlineSpan tree', () {
    final t = _Tree();

    // <Text color="#fff">                          ← becomes Text.rich
    //   <View width={18} />                        ← WidgetSpan
    //   <TextSpan fontWeight="bold" onTap>@lysbth</TextSpan>  ← tappable run
    //   <TextSpan>caption <TextSpan color="#888">more</TextSpan></TextSpan> ← nested
    // </Text>
    final root = t.node('text', {'color': '#ffffff'}, [
      t.node('view', {'width': 18}),
      t.node('textSpan', {'fontWeight': 'bold', 'onTap': true}, [t.text('@lysbth')]),
      t.node('textSpan', {}, [
        t.text('caption '),
        t.node('textSpan', {'color': '#888888'}, [t.text('more')]),
      ]),
    ]);

    final recognizers = <GestureRecognizer>[];
    final span = buildRootSpan(root, recognizers);

    // Root style comes from the richText node.
    expect(span.style?.color?.toARGB32(), 0xFFFFFFFF);

    final children = span.children!;
    expect(children.length, 3);

    // 1) WidgetSpan for the <view> child.
    expect(children[0], isA<WidgetSpan>());

    // 2) Tappable bold TextSpan carrying its own text + a recognizer.
    final tappable = children[1] as TextSpan;
    expect(tappable.text, '@lysbth');
    expect(tappable.style?.fontWeight, FontWeight.bold);
    expect(tappable.recognizer, isA<TapGestureRecognizer>());
    expect(recognizers, contains(tappable.recognizer));

    // 3) Nested TextSpan: direct text on the parent, nested run as a child.
    final nested = children[2] as TextSpan;
    expect(nested.text, 'caption ');
    expect(nested.recognizer, isNull);
    final inner = nested.children!.single as TextSpan;
    expect(inner.text, 'more');
    expect(inner.style?.color?.toARGB32(), 0xFF888888);
  });

  test('a tappable span fires its onTap callback', () {
    _Tree._calls.clear();
    final t = _Tree();
    final root = t.node('text', {}, [
      t.node('textSpan', {'onTap': true}, [t.text('tap me')]),
    ]);

    final recognizers = <GestureRecognizer>[];
    final span = buildRootSpan(root, recognizers);
    final tappable = span.children!.single as TextSpan;

    (tappable.recognizer as TapGestureRecognizer).onTap!();
    expect(_Tree._calls, contains('2.onTap'));
  });
}
