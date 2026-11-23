// Generated adapters, pumped. lib/generated/fuse.generated.dart is written by
// cli/gen/gen.test.ts before it runs this file.
import 'dart:convert';
import 'dart:typed_data';

import 'package:fixture_app/fixture.dart';
import 'package:fixture_app/src/annotated.dart';
import 'package:fixture_app/generated/fuse.generated.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart' as m;
import 'package:solid_fuse/generated.dart' show FuseCallArgs, FuseCallbackError;
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
      create(2, 'flutter_Text', {'maxLines': 2, 'textAlign': 'center', 'data': 'hi'}),
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
      create(2, 'flutter_Text', {'data': 'icon'}),
      create(4, 'flutter_Text', {'data': 'end'}),
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

  testWidgets('builders call JS synchronously; each built item is unbuilt when it goes', (t) async {
    // Stands in for renderer.ts: item i is a text node 100 + i in root i;
    // from index 3 on, nothing (the end of the list).
    final unbuilt = <int>[];
    rt.debugUnbuild = unbuilt.add;
    var batch = 0;
    rt.debugCallSync = (channel, data) {
      expect(channel, '_callSync');
      expect(data['widget'], true);
      final i = data['value'] as int;
      if (i >= 3) return {'result': {'value': null}, 'ops': {'v': 4, 'g': 0, 'batches': []}};
      final ops = jsonEncode([...create(100 + i, 'flutter_Text', {'data': 'item $i'})]);
      return {
        'result': {'value': {'_node': 100 + i}, 'root': i},
        'ops': {'v': 4, 'g': 0, 'batches': [[batch++, ops]]},
      };
    };
    await pump(t, [create(1, 'flutter_ListViewBuilder', {'itemBuilder': true})], 1);
    expect(find.text('item 0'), findsOneWidget);
    expect(find.text('item 2'), findsOneWidget);
    expect(find.text('item 3'), findsNothing);
    await t.pumpWidget(const SizedBox());
    expect(unbuilt..sort(), [0, 1, 2]);
  });

  testWidgets('a callback that returns a value is called synchronously', (t) async {
    rt.debugCallSync = (channel, data) => {
          'result': {'value': (data['value'] as int) * 2},
        };
    await pump(t, [create(1, 'fixture_app_FixtureBox', {'at': {r'$': 'Point', 'x': 0}, 'measure': true})], 1);
    expect(t.widget<FixtureBox>(find.byType(FixtureBox)).measure!(21), 42);
  });

  testWidgets('a BuildContext parameter gets the context the adapter builds in', (t) async {
    await pump(t, [create(1, 'fixture_app_NeedsContext')], 1);
    final w = t.widget<NeedsContext>(find.byType(NeedsContext));
    expect(w.ctx.findAncestorWidgetOfExactType<FuseRuntimeScope>(), isNotNull);
  });

  testWidgets('a generic widget and a value generic over its type parameter', (t) async {
    await pump(t, [
      create(1, 'fixture_app_Choice', {
        'options': [
          {r'$': 'Option', 'value': {'id': 7}, 'label': 'seven'},
        ],
      }),
    ], 1);
    expect(find.text('seven'), findsOneWidget);
    final c = t.widget<Choice<Object?>>(find.byType(Choice<Object?>));
    expect(c.options.single.value, {'id': 7});
  });

  testWidgets('shorthands, and the app\'s own @fuse widget', (t) async {
    await pump(t, [
      create(1, 'flutter_Container', {
        'padding': 8,
        'decoration': {r'$': 'BoxDecoration', 'borderRadius': 12, 'color': '#ff880080'},
      }),
      create(2, 'fixture_app_Badge', {'label': 'b', 'at': 3}),
      insert(1, 2),
    ], 1);
    final box = t.widget<Container>(find.byType(Container));
    expect(box.padding, const EdgeInsets.all(8));
    final deco = box.decoration! as BoxDecoration;
    expect(deco.borderRadius, BorderRadius.circular(12));
    expect(deco.color, const Color(0x80ff8800));
    expect(t.widget<Badge>(find.byType(Badge)).at.x, 3);
    expect(find.text('b'), findsOneWidget);
  });

  testWidgets('a PreferredSizeWidget slot takes an app bar', (t) async {
    await pump(t, [
      create(1, 'material_ui_MaterialApp'),
      create(2, 'material_ui_Scaffold'),
      create(3, 'material_ui_AppBar'),
      create(4, 'flutter_Text', {'data': 'title'}),
      setProp(3, 'title', {'_node': 4}),
      setProp(2, 'appBar', {'_node': 3}),
      setProp(1, 'home', {'_node': 2}),
    ], 1);
    expect(find.text('title'), findsOneWidget);
    expect(t.getSize(find.byType(m.AppBar)).height, m.kToolbarHeight);
    // The app bar is part of the scaffold's widget: a change rebuilds it.
    rt.applyOps([...text(6, 'other'), ...setProp(3, 'title', {'_node': 6})]);
    await t.pump();
    expect(find.text('other'), findsOneWidget);
  });

  testWidgets('a typed slot takes the widget itself, and rebuilds with it', (t) async {
    await pump(t, [
      create(1, 'fixture_app_Shelf'),
      create(2, 'fixture_app_Pill', {'label': 'a'}),
      create(3, 'fixture_app_Pill', {'label': 'b'}),
      create(4, 'fixture_app_Pill', {'label': 'c'}),
      setProp(1, 'lead', {'_node': 2}),
      setProp(1, 'pills', [{'_node': 3}, {'_node': 4}]),
    ], 1);
    final shelf = t.widget<Shelf>(find.byType(Shelf));
    expect(shelf.lead!.label, 'a');
    expect([for (final p in shelf.pills) p.label], ['b', 'c']);
    rt.applyOps([...setProp(3, 'label', 'B')]);
    await t.pump();
    expect(find.text('pill B'), findsOneWidget);
    // Once a slot lets go of a node, its changes don't rebuild the shelf.
    rt.applyOps([...setProp(1, 'pills', <Object?>[])]);
    await t.pump();
    expect(find.text('pill B'), findsNothing);
  });

  testWidgets('a typed slot given another widget is an error naming both', (t) async {
    await pump(t, [
      create(1, 'fixture_app_Shelf'),
      create(2, 'flutter_Text', {'data': 'x'}),
      setProp(1, 'lead', {'_node': 2}),
    ], 1);
    expect(t.takeException(), isA<ArgumentError>().having((e) => '$e', 'message', contains('<flutter_Text> is not a Pill')));
  });

  group('a created handle', () {
    late List<(int, String, Object?)> calls;
    late FuseNodeRegistry registry;
    late FuseHandle h;
    late Counter counter;
    setUp(() {
      calls = [];
      registry = FuseNodeRegistry(callFunction: (id, name, [v]) => calls.add((id, name, v)));
      final node = registry.create(7, 'fixture_app_Counter', {'start': 2, 'label': 'a', r'$push': true});
      h = node.ownHandle = fuseGeneratedHandles['fixture_app_Counter']!(node);
      counter = h.object as Counter;
    });
    Map<Object?, Object?> lastPush() => calls.lastWhere((c) => c.$2 == r'$push').$3! as Map;

    test('pushes its state on creation, then what changed', () async {
      final s = lastPush()['s']! as Map;
      expect(s..remove('tracker'), {'start': 2, 'parent': null, 'count': 2, 'label': 'a', 'disposed': false});
      await h.call('increment', <Object?>[]);
      await Future<void>.delayed(Duration.zero);
      expect(lastPush(), {'v': 0, 's': {'count': 3}});
    });

    test('setters carry a version; the next push confirms it', () async {
      await h.call(r'$set', {'n': 'label', 'v': 'b', 'ver': 4});
      await Future<void>.delayed(Duration.zero);
      expect(counter.label, 'b');
      expect(lastPush()['v'], 4);
      expect((lastPush()['s']! as Map)['label'], 'b');
    });

    test('methods take positional and named arguments and return values', () async {
      expect(await h.call('add', <Object?>[2, {'times': 3}]), 8);
      expect(counter.count, 8);
    });

    test('streams run into a JS function until cancelled', () async {
      await h.call(r'$listen', {'stream': 'ticks', 'fn': r'$s0'});
      counter.tick();
      await Future<void>.delayed(Duration.zero);
      expect((calls.last.$1, calls.last.$2), (7, r'$s0'));
      expect(calls.last.$3, {'v': 2});
      await h.call(r'$cancel', {'fn': r'$s0'});
      counter.tick();
      await Future<void>.delayed(Duration.zero);
      expect(calls.where((c) => c.$2 == r'$s0'), hasLength(1));
    });

    test('a handle JS created goes back to JS as itself', () async {
      expect(await h.call('self', <Object?>[]), {r'$h': 7, 't': 'fixture_app_Counter', 'o': 1});
    });

    test('a handle only Dart makes is lent, with its state, and counted', () async {
      final first = lastPush()['s']! as Map;
      final ref = first['tracker']! as Map;
      expect(ref[r'$h'], isNegative);
      expect(ref['t'], 'fixture_app_Tracker');
      expect(ref['s'], {'hits': 0});
      final id = ref[r'$h'] as int;
      final tracker = registry.get(id).ownHandle!;
      expect(tracker.object, same(counter.tracker));

      // Lent again (a later push re-reads it): same node, no state.
      counter.increment();
      await Future<void>.delayed(Duration.zero);
      expect((lastPush()['s']! as Map).containsKey('tracker'), false);
      final spawned = await h.call('spawn', <Object?>[]) as Map;
      expect(spawned[r'$h'], isNot(id));

      // The tracker mirrors and forwards like any handle.
      await tracker.call('hit', <Object?>[]);
      await Future<void>.delayed(Duration.zero);
      expect((calls.last.$1, calls.last.$2), (id, r'$push'));
      expect(calls.last.$3, {'v': 0, 's': {'hits': 1}});

      // JS gives its one reference back: the node goes, the object stays.
      registry.unborrow(id, 1);
      expect(registry.tryGet(id), isNull);
      counter.tracker.hit();
      expect(counter.tracker.hits, 2);
    });

    testWidgets('a callback argument that is a handle is lent', (t) async {
      final sent = <(int, String, Object?)>[];
      final reg = FuseNodeRegistry(callFunction: (id, name, [v]) => sent.add((id, name, v)));
      final box = reg.create(1, 'fixture_app_FixtureBox', {'at': {r'$': 'Point', 'x': 0}, 'onTracker': true});
      await t.pumpWidget(Builder(builder: (_) => fuseGeneratedWidgets['fixture_app_FixtureBox']!(box)));
      final w = t.widget<FixtureBox>(find.byType(FixtureBox));
      final tracker = Counter().tracker;
      w.onTracker!(tracker);
      w.onTracker!(tracker);
      final refs = [for (final s in sent) s.$3! as Map];
      expect(refs[0][r'$h'], refs[1][r'$h']);
      expect(refs[0]['s'], {'hits': 0});
      expect(refs[1].containsKey('s'), false);
      reg.unborrow(refs[0][r'$h'] as int, 1);
      expect(reg.tryGet(refs[0][r'$h'] as int), isNotNull);
      reg.unborrow(refs[0][r'$h'] as int, 1);
      expect(reg.tryGet(refs[0][r'$h'] as int), isNull);
    });

    test('a constructor option that is a handle', () {
      final child = registry.create(8, 'fixture_app_Counter', {'parent': registry.get(7)});
      child.ownHandle = fuseGeneratedHandles['fixture_app_Counter']!(child);
      expect((child.ownHandle!.object as Counter).parent, same(counter));
      final s = calls.lastWhere((c) => c.$1 == 8 && c.$2 == r'$push').$3! as Map;
      expect((s['s']! as Map)['parent'], {r'$h': 7, 't': 'fixture_app_Counter', 'o': 1});
    });

    testWidgets('dispose stops pushing and frees the object after the frame', (t) async {
      registry.remove(7);
      counter.increment();
      await t.pump();
      expect(counter.disposed, true);
    });
  });

  testWidgets('JS implements an abstract class: each member calls its function', (t) async {
    final sync = <(String, Object?)>[];
    final async = <String>[];
    final reg = FuseNodeRegistry(
      callFunction: (id, name, [v]) => async.add(name),
      callFunctionSync: (id, name, value, {widget = false}) {
        sync.add((name, value));
        return (name == 'scorer#1' ? 'js' : 7, null);
      },
    );
    final box = reg.create(1, 'fixture_app_FixtureBox', {
      'at': {r'$': 'Point', 'x': 0},
      'scorer': {
        'score': {r'$fn': 'scorer#0'},
        'name': {r'$fn': 'scorer#1'},
        'reset': {r'$fn': 'scorer#2'},
      },
    });
    await t.pumpWidget(Builder(builder: (_) => fuseGeneratedWidgets['fixture_app_FixtureBox']!(box)));
    final scorer = t.widget<FixtureBox>(find.byType(FixtureBox)).scorer!;
    expect(scorer.describe(const Point(1, 2)), 'js: 7');
    expect(sync.map((c) => c.$1), ['scorer#1', 'scorer#0']);
    expect(sync[1].$2, {'x': 1.0, 'y': 2.0});
    scorer.reset();
    expect(async, ['scorer#2']);

    // A tagged value is still a Dart variant.
    box.setPropSilent('scorer', {r'$': 'FixedScorer', 'value': 3});
    box.markDirty();
    await t.pumpWidget(Builder(builder: (_) => fuseGeneratedWidgets['fixture_app_FixtureBox']!(box)), duration: Duration.zero);
    expect(t.widget<FixtureBox>(find.byType(FixtureBox)).scorer, isA<FixedScorer>());

    // A member the object left out is an error naming it.
    box.setPropSilent('scorer', {'score': {r'$fn': 'scorer#0'}});
    await t.pumpWidget(const SizedBox());
    await t.pumpWidget(Builder(builder: (_) => fuseGeneratedWidgets['fixture_app_FixtureBox']!(box)));
    final partial = t.widget<FixtureBox>(find.byType(FixtureBox)).scorer!;
    expect(() => partial.name, throwsA(isA<FuseCallbackError>().having((e) => '$e', 'message', contains('"name"'))));
  });

  testWidgets('bytes, maps keyed by values, and named callback arguments', (t) async {
    final sent = <(String, Object?)>[];
    final reg = FuseNodeRegistry(
      callFunction: (id, name, [v]) => sent.add((name, v)),
      callFunctionSync: (id, name, value, {widget = false}) {
        sent.add((name, value));
        return (null, null);
      },
    );
    final raw = Float32List.fromList([1.5, 2.5]).buffer.asUint8List();
    final box = reg.create(1, 'fixture_app_FixtureBox', {
      'at': {r'$': 'Point', 'x': 0},
      'bytes': Uint8List.fromList([1, 2, 3]),
      'samples': raw,
      'labels': [
        [{'x': 1}, 'one'],
        [{'x': 2, 'y': 3}, 'two'],
      ],
      'onBytes': true,
      'onLabels': true,
      'counted': true,
    });
    await t.pumpWidget(Builder(builder: (_) => fuseGeneratedWidgets['fixture_app_FixtureBox']!(box)));
    final w = t.widget<FixtureBox>(find.byType(FixtureBox));
    expect(w.bytes, [1, 2, 3]);
    expect(w.samples, [1.5, 2.5]);
    expect([for (final MapEntry(:key, :value) in w.labels!.entries) (key.x, key.y, value)], [(1.0, 0.0, 'one'), (2.0, 3.0, 'two')]);

    w.onBytes!(Uint8List.fromList([9]));
    expect(sent.last.$2, isA<Uint8List>().having((b) => b.toList(), 'bytes', [9]));
    w.onLabels!({const Point(1, 2): 3});
    expect(sent.last.$2, [
      [{'x': 1.0, 'y': 2.0}, 3],
    ]);
    w.counted!(t.element(find.byType(FixtureBox)), 4, count: 2, label: 'l');
    expect(sent.last.$1, 'counted');
    expect((sent.last.$2! as FuseCallArgs).args, [4, {'count': 2, 'label': 'l'}]);
  });

  testWidgets('a default Dart keeps private applies unless JS gives the prop', (t) async {
    await pump(t, [create(1, 'fixture_app_FixtureBox', {'at': {r'$': 'Point', 'x': 0}})], 1);
    expect(t.widget<FixtureBox>(find.byType(FixtureBox)).hidden, isNot(isA<Square>()));
    rt.applyOps([...setProp(1, 'hidden', {r'$': 'Square.unit'})]);
    await t.pump();
    expect(t.widget<FixtureBox>(find.byType(FixtureBox)).hidden, isA<Square>());
  });

  test('a batch carries its bytes next to its JSON', () {
    final rt2 = FuseRuntime.forTest();
    rt2.applyBatch(null, null, jsonEncode([0, 1, 'view', {'data': {r'$bytes': 0}}]), bytes: [Uint8List.fromList([7, 8])]);
    expect(rt2.registry.get(1)['data'], [7, 8]);
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
