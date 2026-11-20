// Proves the generated adapters against the real Flutter widgets: build a
// FuseNode with JSON-ish props (exactly what the `create` / `setProp` ops
// deliver), pump the generated adapter, inspect the real widget.
// ignore_for_file: deprecated_member_use
import 'dart:convert';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fuse_gen_spike/generated/flutter.g.dart';
import 'package:solid_fuse/solid_fuse.dart';

class Bridge {
  final calls = <(int, String, dynamic)>[];
  late final registry = FuseNodeRegistry(
    callFunction: (id, name, [value]) {
      // The real bridge JSON-encodes the payload; make sure ours survives it.
      calls.add((id, name, jsonDecode(jsonEncode(value))));
    },
  );
  var _id = 1;

  /// Props go through a JSON round trip, like the wire.
  FuseNode node(String type, Map<String, dynamic> props, {List<FuseNode> children = const []}) {
    bool isRef(Object? v) => v is FuseNode || (v is List && v.every((e) => e is FuseNode));
    final refs = {for (final e in props.entries) if (isRef(e.value)) e.key: e.value};
    final json = Map<String, dynamic>.from(
      jsonDecode(jsonEncode({for (final e in props.entries) if (!isRef(e.value)) e.key: e.value})) as Map,
    );
    final n = registry.create(_id++, type, {...json, ...refs});
    for (final c in children) {
      n.insertChildSilent(n.children.length, c);
    }
    return n;
  }

  FuseNode text(String s) => node('__text__', {'text': s});
}

Widget host(Widget child) => MaterialApp(home: Scaffold(body: Center(child: child)));

void main() {
  testWidgets('Container: enums, derived data classes, unions, overrides', (tester) async {
    final b = Bridge();
    final node = b.node('gen_Container', {
      'width': 120,
      'height': 80.5,
      'alignment': 'bottomRight', // static const enum-like
      'clipBehavior': 'antiAlias', // enum
      'padding': 16, // override: number -> EdgeInsets.all
      'margin': {r'$': 'only', 'left': 4, 'top': 2}, // derived: named ctor
      'constraints': {'minWidth': 10, 'maxWidth': 300}, // derived: unnamed ctor
      'transformAlignment': {r'$': 'Alignment', 'x': 0.5, 'y': -1}, // derived: subclass ctor in a union
      'decoration': {
        r'$': 'BoxDecoration', // abstract Decoration -> tagged union
        'color': '#336699', // override: hex
        'borderRadius': {r'$': 'circular', 'radius': 12},
        'border': {r'$': 'all', 'color': {r'$': 'fromARGB', 'a': 255, 'r': 1, 'g': 2, 'b': 3}, 'width': 2},
        'gradient': {
          r'$': 'LinearGradient',
          'colors': ['Colors.red', {'value': 0xFF00FF00}],
          'stops': [0, 1],
          'begin': 'topLeft',
          'end': 'bottomRight',
        },
        'boxShadow': [
          {'color': 'Colors.black26', 'blurRadius': 8, 'offset': {'dx': 0, 'dy': 2}},
        ],
      },
    });
    await tester.pumpWidget(host(FuseGenContainer(node)));
    final c = tester.widget<Container>(find.byType(Container));
    expect(c.alignment, Alignment.bottomRight);
    expect(c.clipBehavior, Clip.antiAlias);
    expect(c.padding, const EdgeInsets.all(16));
    expect(c.margin, const EdgeInsets.only(left: 4, top: 2));
    expect(c.constraints, const BoxConstraints(minWidth: 10, maxWidth: 300).tighten(width: 120, height: 80.5));
    expect(c.transformAlignment, const Alignment(0.5, -1));
    final d = c.decoration! as BoxDecoration;
    expect(d.color, const Color(0xFF336699));
    expect(d.borderRadius, BorderRadius.circular(12));
    expect(d.border, Border.all(color: const Color.fromARGB(255, 1, 2, 3), width: 2));
    final g = d.gradient! as LinearGradient;
    expect(g.colors, [Colors.red, const Color(0xFF00FF00)]);
    expect(g.stops, [0.0, 1.0]);
    expect(g.begin, Alignment.topLeft);
    expect(d.boxShadow, const [BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 2))]);
  });

  testWidgets('Text: text children fill the positional `data`; TextStyle decodes', (tester) async {
    final b = Bridge();
    final node = b.node(
      'gen_Text',
      {
        'maxLines': 2,
        'overflow': 'ellipsis',
        'textAlign': 'center',
        'style': {
          'fontSize': 18,
          'fontWeight': 700, // override
          'fontStyle': 'italic',
          'color': 'Colors.teal',
          'decoration': 'underline',
          'letterSpacing': 1.5,
          'shadows': [
            {'color': '#00000080', 'blurRadius': 3},
          ],
        },
      },
      children: [b.text('Hello '), b.text('world')],
    );
    await tester.pumpWidget(host(FuseGenText(node)));
    final t = tester.widget<Text>(find.byType(Text));
    expect(t.data, 'Hello world');
    expect(t.maxLines, 2);
    expect(t.overflow, TextOverflow.ellipsis);
    expect(t.textAlign, TextAlign.center);
    expect(t.style!.fontSize, 18);
    expect(t.style!.fontWeight, FontWeight.w700);
    expect(t.style!.fontStyle, FontStyle.italic);
    expect(t.style!.color, Colors.teal);
    expect(t.style!.decoration, TextDecoration.underline);
    expect(t.style!.shadows, const [Shadow(color: Color(0x80000000), blurRadius: 3)]);
    expect(find.text('Hello world'), findsOneWidget);
  });

  testWidgets('Switch: required prop, callback round trip with primitive payload', (tester) async {
    final b = Bridge();
    final node = b.node('gen_Switch', {
      'value': false,
      'onChanged': true, // functions cross as `true`
      'activeTrackColor': '#ff0000',
      'thumbColor': {r'$': 'WidgetStatePropertyAll', 'value': '#00ff00'},
      'materialTapTargetSize': 'shrinkWrap',
    });
    await tester.pumpWidget(host(FuseGenSwitch(node)));
    final s = tester.widget<Switch>(find.byType(Switch));
    expect(s.value, false);
    expect(s.activeTrackColor, const Color(0xFFFF0000));
    expect(s.thumbColor!.resolve({}), const Color(0xFF00FF00));
    expect(s.materialTapTargetSize, MaterialTapTargetSize.shrinkWrap);
    await tester.tap(find.byType(Switch));
    expect(b.calls, [(node.id, 'onChanged', true)]);

    // No handler registered -> null callback -> Flutter renders it disabled.
    final off = b.node('gen_Switch', {'value': true});
    await tester.pumpWidget(host(FuseGenSwitch(off)));
    expect(tester.widget<Switch>(find.byType(Switch)).onChanged, isNull);

    // Missing required prop is a clear error, not a silent default.
    await tester.pumpWidget(host(FuseGenSwitch(b.node('gen_Switch', {}))));
    expect(tester.takeException().toString(), contains('required prop "value" is missing'));
  });

  testWidgets('GestureDetector: generated encoder for a details object', (tester) async {
    final b = Bridge();
    final node = b.node('gen_GestureDetector', {
      'onTap': true,
      'onPanUpdate': true,
      'behavior': 'opaque',
      'dragStartBehavior': 'down',
      'supportedDevices': ['touch', 'mouse'],
    });
    await tester.pumpWidget(host(FuseGenGestureDetector(node)));
    final g = tester.widget<GestureDetector>(find.byType(GestureDetector));
    expect(g.behavior, HitTestBehavior.opaque);
    expect(g.dragStartBehavior, DragStartBehavior.down);
    expect(g.supportedDevices, {PointerDeviceKind.touch, PointerDeviceKind.mouse});
    expect(g.onPanStart, isNull);
    g.onTap!();
    g.onPanUpdate!(DragUpdateDetails(
      globalPosition: const Offset(10, 20),
      localPosition: const Offset(1, 2),
      delta: const Offset(3, 4),
      sourceTimeStamp: const Duration(milliseconds: 1500),
    ));
    expect(b.calls[0], (node.id, 'onTap', null));
    final (id, name, payload) = b.calls[1];
    expect((id, name), (node.id, 'onPanUpdate'));
    expect(payload, {
      'globalPosition': {'dx': 10.0, 'dy': 20.0},
      'localPosition': {'dx': 1.0, 'dy': 2.0},
      'sourceTimeStamp': 1500, // Duration override: ms
      'delta': {'dx': 3.0, 'dy': 4.0},
      'primaryDelta': null,
      'kind': null,
    });
  });

  testWidgets('Slider + AnimatedContainer: defaults reproduced, Duration/Curve forms', (tester) async {
    final b = Bridge();
    final slider = b.node('gen_Slider', {'value': 0.25, 'onChanged': true, 'divisions': 4});
    await tester.pumpWidget(host(FuseGenSlider(slider)));
    final s = tester.widget<Slider>(find.byType(Slider));
    expect((s.value, s.min, s.max, s.divisions), (0.25, 0.0, 1.0, 4)); // min/max defaults regenerated
    s.onChanged!(0.75);
    expect(b.calls.single, (slider.id, 'onChanged', 0.75));

    final a = b.node('gen_AnimatedContainer', {
      'duration': 300, // override: ms
      'curve': 'Curves.easeInOut', // namespace constant
      'height': 10,
    });
    await tester.pumpWidget(host(FuseGenAnimatedContainer(a)));
    final ac = tester.widget<AnimatedContainer>(find.byType(AnimatedContainer));
    expect(ac.duration, const Duration(milliseconds: 300));
    expect(ac.curve, Curves.easeInOut);

    final a2 = b.node('gen_AnimatedContainer', {
      'duration': {'seconds': 1, 'milliseconds': 500}, // derived: Duration's own ctor
      'curve': {r'$': 'Cubic', 'a': 0.1, 'b': 0.2, 'c': 0.3, 'd': 0.4}, // derived: subclass ctor
    });
    await tester.pumpWidget(host(FuseGenAnimatedContainer(a2)));
    final ac2 = tester.widget<AnimatedContainer>(find.byType(AnimatedContainer));
    expect(ac2.duration, const Duration(milliseconds: 1500));
    final cubic = ac2.curve as Cubic; // Cubic has no ==
    expect((cubic.a, cubic.b, cubic.c, cubic.d), (0.1, 0.2, 0.3, 0.4));
  });

  testWidgets('ListTile / AppBar: widget slots resolve node refs', (tester) async {
    final b = Bridge();
    final title = b.node('gen_Text', {}, children: [b.text('Title')]);
    final action = b.node('gen_Icon', {'icon': {'codePoint': 0xe145}});
    final tile = b.node('gen_ListTile', {'title': title, 'dense': true, 'onTap': true});
    final bar = b.node('gen_AppBar', {'title': title, 'actions': [action], 'centerTitle': true, 'elevation': 3});
    // Slots are FuseNodeWidgets, which need a live FuseRuntime (native QuickJS)
    // to build, so inspect the adapter's build output instead of pumping it.
    await tester.pumpWidget(host(const SizedBox()));
    final ctx = tester.element(find.byType(SizedBox));
    final lt = FuseGenListTile(tile).build(ctx) as ListTile;
    expect((lt.title! as FuseNodeWidget).node, same(title));
    expect(lt.dense, true);
    expect(lt.leading, isNull);
    lt.onTap!();
    expect(b.calls.single, (tile.id, 'onTap', null));
    final ab = FuseGenAppBar(bar).build(ctx) as AppBar;
    expect((ab.title! as FuseNodeWidget).node, same(title));
    expect((ab.actions!.single as FuseNodeWidget).node, same(action));
    expect((ab.centerTitle, ab.elevation), (true, 3.0));

    final icon = FuseGenIcon(action).build(ctx) as Icon;
    expect(icon.icon!.codePoint, 0xe145);
  });

  test('registration covers every generated adapter', () {
    expect(registerFlutterWidgets, isA<Function>());
  });
}
