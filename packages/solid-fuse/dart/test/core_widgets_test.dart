// Core widgets with logic of their own, driven by ops as JS would send
// them. Calls back to JS are recorded through `debugCallFunction`.
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

List<Object?> create(int id, String type, [Map<String, dynamic>? props]) => [0, id, type, props ?? <String, dynamic>{}];
List<Object?> text(int id, String value) => [1, id, value];
List<Object?> setProp(int id, String name, Object? value) => [2, id, name, value];
List<Object?> insert(int parent, int child, [int? before]) => [4, parent, child, before];

void main() {
  late FuseRuntime rt;
  late List<(int, String, Object?)> calls;
  FuseNode node(int id) => rt.registry.get(id);
  void apply(List<List<Object?>> ops) => rt.applyOps([for (final op in ops) ...op]);
  List<Object?> heard(String name) => [for (final c in calls) if (c.$2 == name) c.$3];

  setUp(() {
    rt = FuseRuntime.forTest();
    registerSolidFuse(rt);
    calls = [];
    rt.debugCallFunction = (id, name, value) => calls.add((id, name, value));
  });

  Widget app() => WidgetsApp(
        color: const Color(0xFF000000),
        pageRouteBuilder: <T>(settings, builder) => PageRouteBuilder<T>(
          settings: settings,
          pageBuilder: (context, _, _) => builder(context),
        ),
        home: FuseView(runtime: rt),
      );

  group('controlled text', () {
    FuseControlledText field(String value) {
      apply([create(1, 'textInput', {'value': value, 'onChange': true})]);
      return FuseControlledText(node(1));
    }

    test('an echo of an earlier change does not move the text back', () {
      final t = field('a');
      t.controller.text = 'ab';
      t.changed('ab');
      t.controller.text = 'abc';
      t.changed('abc');
      expect(heard('onChange'), ['ab', 'abc']);

      // JS sends 'ab' back after the user already typed 'abc'.
      apply([setProp(1, 'value', 'ab')]);
      t.sync(node(1));
      expect(t.controller.text, 'abc');

      // Then 'abc': caught up.
      apply([setProp(1, 'value', 'abc')]);
      t.sync(node(1));
      expect(t.controller.text, 'abc');
    });

    test('a value JS writes itself wins and keeps the cursor where it fits', () {
      final t = field('hello');
      t.controller.selection = const TextSelection.collapsed(offset: 2);
      apply([setProp(1, 'value', 'HELLO')]);
      t.sync(node(1));
      expect(t.controller.text, 'HELLO');
      expect(t.controller.selection.baseOffset, 2);

      apply([setProp(1, 'value', 'X')]);
      t.sync(node(1));
      expect(t.controller.text, 'X');
      expect(t.controller.selection.baseOffset, 1);
    });

    test('a write from JS after unanswered changes still wins', () {
      final t = field('a');
      t.controller.text = 'ab';
      t.changed('ab');
      apply([setProp(1, 'value', '')]);
      t.sync(node(1));
      expect(t.controller.text, '');
    });
  });

  group('modal', () {
    // root > [text "body", modal(open) > text "content"]
    void mount({bool open = false}) => apply([
          text(2, 'body'),
          insert(0, 2),
          create(3, 'modal', {'open': open, 'onOpenChange': true, 'onRouteLive': true}),
          text(4, 'content'),
          insert(3, 4),
          insert(0, 3),
        ]);

    testWidgets('takes no part in its parent\'s layout', (tester) async {
      mount();
      await tester.pumpWidget(app());
      expect(find.text('body'), findsOneWidget);
      // One child in flow: no column around it.
      expect(find.byType(Flex), findsNothing);
      expect(find.text('content'), findsNothing);
    });

    testWidgets('open pushes the route with the content; closing reports the route gone after its animation',
        (tester) async {
      mount();
      await tester.pumpWidget(app());

      apply([setProp(3, 'open', true)]);
      await tester.pumpAndSettle();
      expect(find.text('content'), findsOneWidget);
      expect(heard('onRouteLive'), [true]);

      apply([setProp(3, 'open', false)]);
      await tester.pump(); // pops after the frame
      await tester.pump(const Duration(milliseconds: 50));
      expect(heard('onRouteLive'), [true], reason: 'still animating out');
      await tester.pumpAndSettle();
      expect(find.text('content'), findsNothing);
      expect(heard('onRouteLive'), [true, false]);
      // JS closed it: no onOpenChange.
      expect(heard('onOpenChange'), isEmpty);
    });

    testWidgets('dismissed by the barrier: JS hears onOpenChange(false)', (tester) async {
      mount(open: true);
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      expect(find.text('content'), findsOneWidget);

      await tester.tapAt(const Offset(4, 4));
      await tester.pumpAndSettle();
      expect(heard('onOpenChange'), [false]);
      expect(heard('onRouteLive'), [true, false]);
    });

    testWidgets('an unknown route type pushes nothing', (tester) async {
      mount();
      apply([setProp(3, 'type', 'nope')]);
      await tester.pumpWidget(app());
      apply([setProp(3, 'open', true)]);
      await tester.pumpAndSettle();
      expect(find.text('content'), findsNothing);
      expect(heard('onRouteLive'), isEmpty);
    });
  });

  group('expandable', () {
    // root > expandable(header: text "head") > text "body"
    void mount(Map<String, dynamic> props) => apply([
          text(5, 'head'),
          create(1, 'expandable', {'onExpandedChange': true, ...props}),
          setProp(1, 'header', {'_node': 5}),
          text(2, 'body'),
          insert(1, 2),
          insert(0, 1),
        ]);

    testWidgets('a tap asks JS; JS\'s expanded opens and closes it without an echo', (tester) async {
      mount({'expanded': false});
      await tester.pumpWidget(app());
      expect(find.text('body'), findsNothing);

      await tester.tap(find.text('head'));
      await tester.pumpAndSettle();
      expect(heard('onExpandedChange'), [true]);

      // JS agrees, then later closes it.
      apply([setProp(1, 'expanded', true)]);
      await tester.pumpAndSettle();
      expect(find.text('body'), findsOneWidget);
      apply([setProp(1, 'expanded', false)]);
      await tester.pumpAndSettle();
      expect(find.text('body'), findsNothing);
      expect(heard('onExpandedChange'), [true], reason: 'a change JS made is not reported back');
    });

    testWidgets('disabled ignores taps', (tester) async {
      mount({'expanded': false, 'disabled': true});
      await tester.pumpWidget(app());
      await tester.tap(find.text('head'));
      await tester.pumpAndSettle();
      expect(heard('onExpandedChange'), isEmpty);
    });
  });

  group('layout', () {
    testWidgets('flex on a child takes its share; on a lone child too', (tester) async {
      apply([
        create(1, 'view', {'layout': {'direction': 'horizontal'}, 'width': 300}),
        create(2, 'view', {'flex': 2, 'height': 10}),
        create(3, 'view', {'flex': 1, 'height': 10}),
        insert(1, 2),
        insert(1, 3),
        insert(0, 1),
        create(4, 'view', {'width': 120, 'height': 40}),
        create(5, 'view', {'flex': 1}),
        insert(4, 5),
        insert(0, 4),
      ]);
      await tester.pumpWidget(app());
      Size size(int id) => tester.getSize(find.byKey(ValueKey(id)));
      expect(size(2).width, 200);
      expect(size(3).width, 100);
      // Alone in a column: still a Flex, so it fills the main axis.
      expect(size(5).height, 40);
    });
  });

  group('pressable', () {
    testWidgets('reports only the flags JS listens to', (tester) async {
      apply([
        create(1, 'pressable', {'onPress': true, 'onPressedChange': true}),
        text(2, 'press'),
        insert(1, 2),
        insert(0, 1),
      ]);
      await tester.pumpWidget(app());
      final gesture = await tester.startGesture(tester.getCenter(find.text('press')));
      await tester.pump();
      expect(heard('onPressedChange'), [true]);
      await gesture.up();
      await tester.pump();
      expect(heard('onPressedChange'), [true, false]);
      expect(heard('onPress'), [null]);
      expect(heard('onHoveredChange'), isEmpty);
    });
  });
}
