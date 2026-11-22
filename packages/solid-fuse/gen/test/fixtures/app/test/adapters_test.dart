// Generated adapters, pumped. lib/generated/fuse.generated.dart is written by
// cli/gen/gen.test.ts before it runs this file.
import 'package:fixture_app/fixture.dart';
import 'package:fixture_app/generated/fuse.generated.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart' as m;
import 'package:solid_fuse/solid_fuse.dart';

List<Object?> create(int id, String type, [Map<String, dynamic>? props]) => [0, id, type, props ?? <String, dynamic>{}];
List<Object?> text(int id, String value) => [1, id, value];
List<Object?> insert(int parent, int child) => [4, parent, child, null];
List<Object?> setProp(int id, String name, Object? value) => [2, id, name, value];

void main() {
  late FuseRuntime rt;
  setUp(() {
    rt = FuseRuntime.forTest();
    registerFuseGenerated(rt);
  });

  Future<void> pump(WidgetTester t, List<List<Object?>> ops, int root) async {
    rt.applyOps([for (final op in ops) ...op]);
    await t.pumpWidget(FuseRuntimeScope(
      runtime: rt,
      child: Directionality(textDirection: TextDirection.ltr, child: FuseNodeWidget(node: rt.registry.get(root))),
    ));
  }

  testWidgets('tagged values, text children and a child slot', (t) async {
    await pump(t, [
      create(1, 'flutter_Padding', {
        'padding': {r'$': 'EdgeInsets.symmetric', 'horizontal': 8},
      }),
      create(2, 'flutter_Text', {'maxLines': 2, 'textAlign': 'center'}),
      text(3, 'hi'),
      insert(2, 3),
      insert(1, 2),
    ], 1);
    expect(find.text('hi'), findsOneWidget);
    expect(t.widget<Padding>(find.byType(Padding)).padding, const EdgeInsets.symmetric(horizontal: 8));
    final txt = t.widget<Text>(find.byType(Text));
    expect(txt.maxLines, 2);
    expect(txt.textAlign, TextAlign.center);
  });

  testWidgets('constants, plain objects and nested values', (t) async {
    await pump(t, [
      create(1, 'flutter_Container', {
        'color': 'Colors.red',
        'alignment': 'Alignment.center',
        'width': 'Infinity',
        'constraints': {'maxWidth': 100},
      }),
    ], 1);
    final box = t.widget<Container>(find.byType(Container));
    expect(box.color, m.Colors.red);
    expect(box.alignment, Alignment.center);
    expect(box.constraints!.maxWidth, 100);
  });

  testWidgets('the app\'s own types: unions by class, positional constructors, defaults', (t) async {
    await pump(t, [
      create(1, 'fixture_app_FixtureBox', {
        'at': {r'$': 'Point', 'x': 1, 'y': 2},
        'shape': {r'$': 'Square.unit'},
        'mode': 'b',
        'weird': null,
      }),
    ], 1);
    final box = t.widget<FixtureBox>(find.byType(FixtureBox));
    expect((box.at.x, box.at.y), (1.0, 2.0));
    expect(box.shape, isA<Square>().having((s) => s.side, 'side', 1));
    expect(box.mode, Mode.b);
    expect(box.size, 3);
    expect(box.tags, ['x']);
  });

  testWidgets('nodes and functions inside values', (t) async {
    await pump(t, [
      create(1, 'fixture_app_Menu'),
      create(2, 'flutter_Text'),
      text(3, 'icon'),
      insert(2, 3),
      create(4, 'flutter_Text'),
      text(5, 'end'),
      insert(4, 5),
      setProp(1, 'items', [
        {'label': 'a', 'onTap': {r'$fn': 'items#0'}},
        {'label': 'b', 'icon': {'_node': 2}},
      ]),
      setProp(1, 'trailing', [{'_node': 4}]),
      setProp(1, 'onRefresh', true),
    ], 1);
    expect(find.text('a'), findsOneWidget);
    expect(find.text('icon'), findsOneWidget);
    expect(find.text('end'), findsOneWidget);
    final menu = t.widget<Menu>(find.byType(Menu));
    expect(menu.items.first.onTap, isNotNull);
    expect(menu.items.last.onTap, isNull);
    expect(menu.onRefresh, isNotNull);
    expect(menu.onPick, isNull);
  });

  testWidgets('a missing required prop is an error naming it', (t) async {
    rt.applyOps([...create(1, 'flutter_Padding')]);
    await t.pumpWidget(FuseRuntimeScope(
      runtime: rt,
      child: Directionality(textDirection: TextDirection.ltr, child: Builder(builder: (_) => fuseGeneratedWidgets['flutter_Padding']!(rt.registry.get(1)))),
    ));
    expect(t.takeException(), isA<ArgumentError>().having((e) => '$e', 'message', contains('"padding" is required')));
  });
}
