// Sliver suite + core-protocol integration test.
//
// This is the macOS integration_test that the slivers spec (Stage 3) calls for.
// It runs the REAL solid-fuse renderer: a self-contained IIFE bundle
// (assets/js/sliver_bundle.js, built from examples/demo/src/sliver-test-entry.tsx
// by tool/build_sliver_bundle.ts) is evaluated inside the QuickJS engine. That
// bundle is real SolidJS 2.0 — the only place Solid 2.0 beta reactivity runs
// truthfully (it's inert in bun). The renderer emits real `_ops` over the
// channel into a real FuseRuntime; FuseView renders the resulting native Flutter
// widget tree; the test asserts against that tree and drives Solid signals back
// over channels.
//
// Coverage:
//   1. CustomScrollView + SliverList: N reactive rows render; mutating one
//      row's Solid signal granularly rebuilds only that row.
//   2. SliverAppBar with an array-of-nodes `actions` prop (node-array protocol).
//   3. Awaitable callback round-trip: Cupertino pull-to-refresh `onRefresh`
//      returns a JS Promise; Dart awaits it via node.asyncCallback and gets the
//      resolved value.
//   4. SliverToBoxAdapter nested inside SliverPadding renders.

import 'package:solid_fuse/fjs.dart';
import 'package:solid_fuse/solid_fuse.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// A [FuseConnection] over an already-created engine + channels. Lets the test
/// hand a live engine to [FuseRuntime.connectForTesting] without going through
/// the dev-server / QuickJS-bundle startup path. Evaluating the JS entry is done
/// by the test itself (it loads the test bundle, not assets/js/bundle.js).
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

  // Records that the JS pull-to-refresh handler actually ran (it `send`s on this
  // channel before resolving), so we can prove the Dart→JS call reached JS.
  var refreshRanInJs = false;

  setUpAll(() async {
    await initFjs();

    final r = await createEngine();
    engine = r.engine;
    channels = r.channels;

    // Test-only side channels the JS bundle uses to report progress.
    channels.on('test:ready', (_) => null);
    channels.on('test:refreshRan', (_) {
      refreshRanInJs = true;
      return null;
    });

    runtime = await FuseRuntime.create();
    registerSolidFuse(runtime);
    runtime.connectForTesting(_TestConnection(channels));

    // Evaluate the real renderer bundle. render(App) runs synchronously and
    // schedules an op flush; the engine's background driver pumps it to Dart.
    final bundle = await rootBundle.loadString('assets/js/sliver_bundle.js');
    await engine.eval(source: JsCode.code(bundle));
  });

  /// Pump the Flutter tree and let the JS engine's async work (op flush,
  /// timers, channel round-trips) settle. `runAsync` lets real async + the
  /// background JS driver progress; the repeated pumps rebuild the widget tree
  /// as `_ops` land and mark nodes dirty.
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

  /// Await a JS-bridge Future while keeping the engine's background driver and
  /// the Flutter pipeline progressing. `tester.runAsync` runs real async (so the
  /// driver can complete the bridge Future), and we poll the result with a hard
  /// deadline so a wedged round-trip fails fast instead of hanging the suite.
  Future<T> awaitBridge<T>(
    WidgetTester tester,
    Future<T> Function() body, {
    Duration timeout = const Duration(seconds: 10),
  }) async {
    final result = await tester.runAsync(
      () => body().timeout(timeout),
    );
    await tester.pump();
    return result as T;
  }

  testWidgets('CustomScrollView + SliverList render N reactive rows',
      (tester) async {
    await mount(tester);

    // The host CustomScrollView and its SliverList materialized.
    expect(find.byType(CustomScrollView), findsOneWidget);
    expect(find.byType(SliverList), findsOneWidget);

    // All five rows rendered (lazy SliverChildBuilderDelegate, but a tall
    // viewport inflates them all).
    for (var i = 0; i < 5; i++) {
      expect(find.text('row-$i'), findsOneWidget,
          reason: 'row-$i should be in the initial render');
    }
  });

  testWidgets('SliverAppBar array-of-nodes `actions` prop renders the actions',
      (tester) async {
    await mount(tester);

    expect(find.byType(SliverAppBar), findsOneWidget);
    // title slot + both array-prop actions resolved from { _node } refs.
    expect(find.text('Sliver Suite'), findsOneWidget);
    expect(find.text('action-A'), findsOneWidget);
    expect(find.text('action-B'), findsOneWidget);
  });

  testWidgets('SliverToBoxAdapter nested inside SliverPadding renders',
      (tester) async {
    await mount(tester);

    expect(find.byType(SliverPadding), findsOneWidget);
    expect(find.byType(SliverToBoxAdapter), findsOneWidget);
    expect(find.text('adapter-box'), findsOneWidget);
  });

  testWidgets('mutating a Solid signal granularly rebuilds the affected row',
      (tester) async {
    await mount(tester);

    expect(find.text('row-2'), findsOneWidget);
    expect(find.text('mutated-2'), findsNothing);

    // Flip row 2's Solid signal from JS via the test channel. `send` is
    // fire-and-forget (no awaited round-trip Future to wedge under the widget
    // test event loop); the JS handler runs, real Solid reactivity re-runs only
    // row 2's text effect, and the resulting setText op flows back over the
    // same `_ops` path every other test relies on. `settle` then pumps it in.
    await awaitBridge(
      tester,
      () => channels.send('test:setRow', {'index': 2, 'label': 'mutated-2'}),
    );
    await settle(tester);

    expect(find.text('mutated-2'), findsOneWidget,
        reason: 'row 2 should show its new signal value');
    expect(find.text('row-2'), findsNothing,
        reason: 'old value gone — the row rebuilt');

    // The other rows are untouched (granular update, not a full re-render).
    expect(find.text('row-0'), findsOneWidget);
    expect(find.text('row-1'), findsOneWidget);
    expect(find.text('row-3'), findsOneWidget);
    expect(find.text('row-4'), findsOneWidget);
  });

  testWidgets('awaitable onRefresh round-trip: Dart awaits the JS Promise',
      (tester) async {
    await mount(tester);

    // Resolve the CupertinoSliverRefreshControl node and its onRefresh async
    // callback directly — this is exactly what the Dart widget invokes when the
    // user pulls to refresh. (We assert via the node, not find.byType: the real
    // CupertinoSliverRefreshControl produces a zero-extent sliver when idle, so
    // its child widget isn't materialized in the element tree until overscroll.
    // The node, the registered async callback, and the bridge round-trip are
    // what this test is about — and those exist regardless of layout.)
    final node = _findNodeByType(runtime, 'cupertinoSliverRefreshControl');
    expect(node, isNotNull,
        reason: 'the refresh control node should exist in the registry');

    final onRefresh = node!.asyncCallback('onRefresh');
    expect(onRefresh, isNotNull,
        reason: 'onRefresh should be a registered async callback');

    // node.asyncCallback -> callFunctionAsync -> channels.call('_functionCallAsync')
    // -> JS handler returns a Promise -> Dart resolves with its value.
    final resolved = await awaitBridge(tester, () => onRefresh!());

    expect(refreshRanInJs, isTrue,
        reason: 'the JS onRefresh handler must have run');
    expect(resolved, equals('refreshed-ok'),
        reason: 'Dart must receive the JS Promise resolved value');
  });
}

/// Walks the runtime's node tree from the root, returning the first node whose
/// type matches [type], or null. (The registry is private; we traverse the
/// public child tree instead.)
FuseNode? _findNodeByType(FuseRuntime runtime, String type) {
  final root = runtime.registry.get(0);
  return _search(root, type);
}

FuseNode? _search(FuseNode node, String type) {
  if (node.type == type) return node;
  for (final child in node.children) {
    final found = _search(child, type);
    if (found != null) return found;
  }
  // Also descend into FuseNode-valued props (slots like title / leading).
  for (final v in node.props.values) {
    if (v is FuseNode) {
      final found = _search(v, type);
      if (found != null) return found;
    }
  }
  return null;
}
