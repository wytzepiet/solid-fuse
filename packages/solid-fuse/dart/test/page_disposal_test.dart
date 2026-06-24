import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/src/handles/material_page.dart';
import 'package:solid_fuse/src/node.dart';

/// Minimal node factory mirroring what the runtime builds. Function props are
/// passed as `true` (the renderer's wire form for a registered callback); the
/// registry records every callback as `'$id.$name'` so tests can assert which
/// fired.
class _Tree {
  _Tree()
    : registry = FuseNodeRegistry(
        callFunction: (id, name, [value]) => calls.add('$id.$name'),
        callFunctionAsync: (id, name, [value]) async => null,
      );

  static final List<String> calls = [];
  final FuseNodeRegistry registry;
  int _nextId = 1;

  FuseNode node(String type, [Map<String, dynamic>? props]) =>
      registry.create(_nextId++, type, props ?? {});
}

/// Drives a declarative Navigator whose pages list can be swapped at runtime.
class _Host extends StatefulWidget {
  const _Host(this.initialPages, {super.key});
  final List<Page<dynamic>> initialPages;
  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  late List<Page<dynamic>> pages = widget.initialPages;
  void setPages(List<Page<dynamic>> next) => setState(() => pages = next);

  @override
  Widget build(BuildContext context) {
    // Nested under MaterialApp so MaterialPageRoute has the Directionality /
    // localizations it needs; we remove pages declaratively via setPages.
    return Navigator(pages: pages, onDidRemovePage: (_) {});
  }
}

void main() {
  setUp(_Tree.calls.clear);

  testWidgets(
    'page disposal fires _onRouteDisposed once its route is removed',
    (tester) async {
      final t = _Tree();
      // Two pages so we can drop the lower one mid-stack and watch it dispose.
      final a = FuseMaterialPage(
        t.node('materialPage', {'_pageId': 1, '_onRouteDisposed': true}),
      ).object;
      final b = FuseMaterialPage(
        t.node('materialPage', {'_pageId': 2, '_onRouteDisposed': true}),
      ).object;

      final hostKey = GlobalKey<_HostState>();
      await tester.pumpWidget(MaterialApp(home: _Host(key: hostKey, [a, b])));
      await tester.pumpAndSettle();

      // Still mounted — nothing disposed yet.
      expect(_Tree.calls, isNot(contains('1._onRouteDisposed')));

      // Drop page A; its route disposes and the content sentinel reports it.
      hostKey.currentState!.setPages([b]);
      await tester.pumpAndSettle();

      expect(_Tree.calls, contains('1._onRouteDisposed'));
      expect(_Tree.calls, isNot(contains('2._onRouteDisposed')));
    },
  );

  testWidgets(
    'a maintainState:false page covered (not removed) does not report disposal',
    (tester) async {
      final t = _Tree();
      // A is destroyed off-stage when covered, but its route is still in the
      // history — disposal must NOT fire, or we'd drop a live page.
      final a = FuseMaterialPage(
        t.node('materialPage', {
          '_pageId': 1,
          '_onRouteDisposed': true,
          'maintainState': false,
        }),
      ).object;
      final b = FuseMaterialPage(
        t.node('materialPage', {'_pageId': 2, '_onRouteDisposed': true}),
      ).object;

      await tester.pumpWidget(MaterialApp(home: _Host([a, b])));
      await tester.pumpAndSettle();

      expect(_Tree.calls, isNot(contains('1._onRouteDisposed')));
    },
  );
}
