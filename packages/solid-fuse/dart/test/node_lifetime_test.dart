// A node JS let go of stays usable while a widget still uses it: routes
// animating out and hero flights keep drawing (and may mount again) nodes
// whose `dispose` op already arrived.
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

List<Object?> create(int id, String type, [Map<String, dynamic>? props]) => [0, id, type, props ?? <String, dynamic>{}];
List<Object?> text(int id, String value) => [1, id, value];
List<Object?> insert(int parent, int child, [int? before]) => [4, parent, child, before];
List<Object?> remove(int child) => [5, child];
List<Object?> dispose(int id) => [6, id];

class _Probe extends FuseHandle<Object> {
  _Probe(super.node);
  static int disposed = 0;
  @override
  final Object object = Object();
  @override
  void dispose() => disposed++;
}

void main() {
  late FuseRuntime rt;
  void apply(List<List<Object?>> ops) => rt.applyOps([for (final op in ops) ...op]);

  setUp(() {
    rt = FuseRuntime.forTest();
    registerSolidFuse(rt);
    rt.debugCallFunction = (id, name, value) {};
    // A hero whose flight shows the hero it leaves (as heroine does).
    rt.registerWidget(
      'hero',
      (node) => Hero(
        tag: node.string('tag')!,
        flightShuttleBuilder: (_, _, _, from, _) => (from.widget as Hero).child,
        child: node.layoutChildren,
      ),
    );
    rt.registerHandle('probe', _Probe.new);
    _Probe.disposed = 0;
  });

  Widget app() => WidgetsApp(
    color: const Color(0xFF000000),
    pageRouteBuilder: <T>(settings, builder) =>
        PageRouteBuilder<T>(settings: settings, pageBuilder: (c, _, _) => builder(c)),
    home: FuseView(runtime: rt),
  );

  // navigator > [page 2 > hero 7 > "small", page 4 > hero 5 > "big"]
  void twoPages() => apply([
    create(1, 'navigator', {'onDidRemovePage': true}),
    create(2, 'page', {'_pageId': 0}),
    create(7, 'hero', {'tag': 'h'}),
    text(8, 'small'),
    insert(7, 8),
    insert(2, 7),
    insert(1, 2),
    create(4, 'page', {'_pageId': 1}),
    create(5, 'hero', {'tag': 'h'}),
    text(6, 'big'),
    insert(5, 6),
    insert(4, 5),
    insert(1, 4),
    insert(0, 1),
  ]);

  testWidgets('a page JS lets go of right after the pop still flies its hero', (tester) async {
    twoPages();
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    apply([remove(4), dispose(4)]);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('big'), findsOneWidget, reason: 'the shuttle draws the popped hero');
    await tester.pumpAndSettle();
    expect(find.text('big'), findsNothing);
    expect(find.text('small'), findsOneWidget);
  });

  testWidgets('a page JS lets go of mid-animation keeps drawing until it is gone', (tester) async {
    twoPages();
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    apply([remove(4)]);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    apply([dispose(4)]);
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('big'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('big'), findsNothing);
  });

  testWidgets('heroes fly between <navigator> pages', (tester) async {
    twoPages();
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    apply([remove(4)]);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    // In flight the shuttle draws it outside any Hero; the page's own hero
    // shows a placeholder.
    expect(find.text('big'), findsOneWidget);
    expect(find.descendant(of: find.byType(Hero), matching: find.text('big')), findsNothing);
    await tester.pumpAndSettle();
  });

  test('a node nothing shows is disposed when JS lets go of it', () {
    apply([create(9, 'probe')]);
    apply([dispose(9)]);
    expect(_Probe.disposed, 1);
  });

  testWidgets('a node JS lets go of while shown is disposed once its widget goes', (tester) async {
    apply([create(9, 'probe'), create(10, 'view'), text(11, 'x'), insert(10, 11), insert(0, 10)]);
    await tester.pumpWidget(app());
    // The handle belongs to node 10's subtree only for this test: give it one.
    final node10 = rt.registry.get(10);
    node10.ownHandle = _Probe(node10);

    apply([remove(10), dispose(10)]);
    expect(_Probe.disposed, 0, reason: 'still listened to this frame');
    await tester.pump();
    await tester.pump();
    expect(_Probe.disposed, 1);
    expect(find.text('x'), findsNothing);
  });
}
