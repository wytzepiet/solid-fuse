// Tab system integration test.
//
// Runs the REAL solid-fuse renderer: a self-contained IIFE bundle
// (assets/js/tabs_bundle.js, built from examples/demo/src/tabs-test-entry.tsx
// by tool/build_tabs_bundle.ts) is evaluated inside the QuickJS engine. That
// bundle is real SolidJS 2.0; its renderer emits real `_ops` into a real
// FuseRuntime; FuseView renders the native Flutter widget tree.
//
// Coverage:
//   1. Explicit controller — a <TabBar> and <TabBarView> sharing one
//      createTabController() resolve to the SAME Flutter TabController.
//   2. Tap sync — tapping a tab moves the controller, swaps the visible page,
//      and the new index is mirrored back to JS over `test:tabIndex`.
//   3. Programmatic — `test:jumpTo` drives the controller from Dart→JS→Dart.
//   4. DefaultTabController — a <TabBar> in a <SliverAppBar>'s `bottom` slot
//      and a <TabBarView> below it get their controller from context (the
//      widgets carry a null `controller`), and both render in one tree.

import 'package:solid_fuse/fjs.dart';
import 'package:solid_fuse/solid_fuse.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// A [FuseConnection] over an already-created engine + channels. The test
/// evaluates the JS bundle itself.
class _TestConnection extends FuseConnection {
  _TestConnection(this._channels);

  final FuseChannels _channels;

  @override
  Future<void> connect() async {}

  @override
  Future<void> start() async {}

  @override
  Future<void> restart() async {}

  @override
  void dispose() {}

  @override
  FuseChannels? get channels => _channels;

  @override
  bool get isConnected => true;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late JsEngine engine;
  late FuseChannels channels;
  late FuseRuntime runtime;

  // Latest index the JS controller pushed over `test:tabIndex`.
  int? lastTabIndex;

  setUpAll(() async {
    await initFjs();

    final r = await createEngine();
    engine = r.engine;
    channels = r.channels;

    channels.on('test:ready', (_) => null);
    channels.on('test:tabIndex', (data) {
      lastTabIndex = (data as Map)['index'] as int?;
      return null;
    });

    runtime = await FuseRuntime.create();
    registerSolidFuse(runtime);
    runtime.connectForTesting(_TestConnection(channels));

    final bundle = await rootBundle.loadString('assets/js/tabs_bundle.js');
    await engine.eval(source: JsCode.code(bundle));
  });

  /// Pump the Flutter tree and let the JS engine's async work settle.
  Future<void> settle(WidgetTester tester) async {
    for (var i = 0; i < 30; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 30)),
      );
      await tester.pump();
    }
  }

  Future<void> mount(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: FuseView(runtime: runtime)),
      ),
    );
    await settle(tester);
  }

  List<TabBar> bars(WidgetTester tester) =>
      tester.widgetList<TabBar>(find.byType(TabBar)).toList();

  List<TabBarView> views(WidgetTester tester) =>
      tester.widgetList<TabBarView>(find.byType(TabBarView)).toList();

  testWidgets('an explicit controller is shared by the bar and the view',
      (tester) async {
    await mount(tester);

    // The explicit bar/view carry a non-null controller; the
    // DefaultTabController pair carry null (resolved from context). Find the
    // explicit pair by that.
    final explicitBar =
        bars(tester).firstWhere((b) => b.controller != null);
    final explicitView =
        views(tester).firstWhere((v) => v.controller != null);

    expect(
      identical(explicitBar.controller, explicitView.controller),
      isTrue,
      reason: 'the bar and the view must drive the same TabController',
    );
    expect(explicitBar.controller!.length, 2);
    expect(explicitBar.tabs.length, 2);
  });

  testWidgets('tapping a tab moves the controller and mirrors the index to JS',
      (tester) async {
    await mount(tester);

    final controller =
        bars(tester).firstWhere((b) => b.controller != null).controller!;
    expect(controller.index, 0);
    expect(lastTabIndex, 0, reason: 'initial index reaches JS');

    await tester.tap(find.text('tab-B'));
    await settle(tester);

    expect(controller.index, 1, reason: 'the tap selected the second tab');
    expect(find.text('page-B'), findsOneWidget,
        reason: 'the view swapped to the second page');
    expect(lastTabIndex, 1, reason: 'the new index was pushed back to JS');
  });

  testWidgets('jumpTo from Dart drives the JS controller', (tester) async {
    await mount(tester);

    final controller =
        bars(tester).firstWhere((b) => b.controller != null).controller!;

    // Move off index 0 first so jumpTo(0) is an observable change.
    await tester.tap(find.text('tab-B'));
    await settle(tester);
    expect(controller.index, 1);

    final result = await channels.call('test:jumpTo', {'index': 0});
    await settle(tester);

    expect(result, equals({'ok': true}));
    expect(controller.index, 0, reason: 'jumpTo reached the Flutter controller');
    expect(lastTabIndex, 0);
  });

  testWidgets('DefaultTabController wires tabs under a SliverAppBar via context',
      (tester) async {
    await mount(tester);

    // The implicit pair carry a null controller — Flutter resolves it from the
    // surrounding DefaultTabController at build time.
    final implicitBar = bars(tester).where((b) => b.controller == null);
    final implicitView = views(tester).where((v) => v.controller == null);
    expect(implicitBar, isNotEmpty,
        reason: 'a context-driven TabBar rendered');
    expect(implicitView, isNotEmpty,
        reason: 'a context-driven TabBarView rendered');
    expect(implicitBar.first.tabs.length, 2);

    // The bar sits in the app bar's bottom slot.
    expect(
      find.descendant(
        of: find.byType(SliverAppBar),
        matching: find.byType(TabBar),
      ),
      findsOneWidget,
      reason: 'the TabBar dropped into the SliverAppBar bottom slot',
    );
    expect(find.text('sliver-A'), findsOneWidget);
  });
}
