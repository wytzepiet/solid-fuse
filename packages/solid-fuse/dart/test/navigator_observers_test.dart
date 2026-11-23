// <Navigator observers>: generated NavigatorObserver handles see the
// navigator's routes.
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/solid_fuse.dart';

List<Object?> create(int id, String type, [Map<String, dynamic>? props]) => [0, id, type, props ?? <String, dynamic>{}];
List<Object?> insert(int parent, int child, [int? before]) => [4, parent, child, before];
List<Object?> remove(int child) => [5, child];

class _Log extends NavigatorObserver {
  final pushes = <Route<dynamic>>[];
  final pops = <Route<dynamic>>[];
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) => pushes.add(route);
  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) => pops.add(route);
}

class _LogHandle extends FuseHandle<NavigatorObserver> {
  _LogHandle(super.node);
  @override
  final _Log object = _Log();
}

void main() {
  late FuseRuntime rt;
  void apply(List<List<Object?>> ops) => rt.applyOps([for (final op in ops) ...op]);

  setUp(() {
    rt = FuseRuntime.forTest();
    registerSolidFuse(rt);
    rt.debugCallFunction = (id, name, value) {};
    rt.registerHandle('log', _LogHandle.new);
  });

  testWidgets('observers see pushes and pops, and stay attached across rebuilds', (tester) async {
    apply([
      create(9, 'log'),
      create(1, 'navigator', {
        'onDidRemovePage': true,
        'observers': [
          {'_node': 9},
        ],
      }),
      create(2, 'page', {'_pageId': 0}),
      insert(1, 2),
      insert(0, 1),
    ]);
    await tester.pumpWidget(
      WidgetsApp(
        color: const Color(0xFF000000),
        pageRouteBuilder: <T>(settings, builder) =>
            PageRouteBuilder<T>(settings: settings, pageBuilder: (c, _, _) => builder(c)),
        home: FuseView(runtime: rt),
      ),
    );
    await tester.pumpAndSettle();
    final log = rt.registry.tryGet(9)!.handle<NavigatorObserver>()! as _Log;
    expect(log.pushes, hasLength(1));
    expect(log.navigator, isNotNull);

    apply([create(4, 'page', {'_pageId': 1}), insert(1, 4)]);
    await tester.pumpAndSettle();
    expect(log.pushes, hasLength(2));

    apply([remove(4)]);
    await tester.pumpAndSettle();
    expect(log.pops, hasLength(1));
    expect(log.navigator, isNotNull);
  });
}
