// Image widget integration test.
//
// Runs the REAL solid-fuse renderer: a self-contained IIFE bundle
// (assets/js/image_bundle.js, built from examples/demo/src/image-test-entry.tsx
// by tool/build_image_bundle.ts) is evaluated inside the QuickJS engine. That
// bundle is real SolidJS 2.0; its renderer emits real `_ops` into a real
// FuseRuntime; FuseView renders the native Flutter widget tree; the test asserts
// against the resulting `Image` widgets.
//
// Coverage — the `src` → `ImageProvider` detection and prop plumbing:
//   1. `http(s)://`            → NetworkImage
//   2. scheme-less + type="network" → NetworkImage (the override path)
//   3. relative path           → AssetImage
//   4. absolute path (`/…`)    → FileImage
//   5. `data:` URI             → MemoryImage, and `borderRadius` wraps it in a
//      ClipRRect, and `fit` reaches the widget
//   6. `color` tint reaches the widget with the default srcIn blend mode

import 'package:solid_fuse/fjs.dart';
import 'package:solid_fuse/solid_fuse.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// A [FuseConnection] over an already-created engine + channels (see the sliver
/// test for the rationale). The test evaluates the JS bundle itself.
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

  setUpAll(() async {
    await initFjs();

    final r = await createEngine();
    engine = r.engine;
    channels = r.channels;

    channels.on('test:ready', (_) => null);

    runtime = await FuseRuntime.create();
    registerSolidFuse(runtime);
    runtime.connectForTesting(_TestConnection(channels));

    final bundle = await rootBundle.loadString('assets/js/image_bundle.js');
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

  /// All `Image` widgets in the rendered tree.
  List<Image> images(WidgetTester tester) =>
      tester.widgetList<Image>(find.byType(Image)).toList();

  testWidgets('every <Image> source kind resolves to the right ImageProvider',
      (tester) async {
    await mount(tester);

    final providers = images(tester).map((i) => i.image).toList();
    expect(providers, isNotEmpty, reason: 'the images should have rendered');

    // 1. http(s):// → NetworkImage
    expect(
      providers.whereType<NetworkImage>().map((n) => n.url),
      contains('https://example.com/n.png'),
      reason: 'an http(s):// src is a network image',
    );

    // 2. scheme-less src forced to network with type="network".
    expect(
      providers.whereType<NetworkImage>().map((n) => n.url),
      contains('cdn.example.com/o.png'),
      reason: 'type="network" overrides detection for a scheme-less URL',
    );

    // 3. relative path → AssetImage
    expect(
      providers.whereType<AssetImage>().map((a) => a.assetName),
      contains('assets/img/a.png'),
      reason: 'a relative src is a bundled asset',
    );

    // 4. absolute path → FileImage
    expect(
      providers.whereType<FileImage>().map((f) => f.file.path),
      contains('/tmp/f.png'),
      reason: 'an absolute path is a local file, never an asset key',
    );

    // 5. data: URI → MemoryImage (two of them in the entry).
    expect(
      providers.whereType<MemoryImage>().length,
      greaterThanOrEqualTo(2),
      reason: 'a data: URI decodes to in-memory bytes',
    );
  });

  testWidgets('borderRadius clips the image and fit/color reach the widget',
      (tester) async {
    await mount(tester);

    // borderRadius wraps the image in a ClipRRect.
    final clipWithImage = find.descendant(
      of: find.byType(ClipRRect),
      matching: find.byType(Image),
    );
    expect(clipWithImage, findsWidgets,
        reason: 'borderRadius should wrap the image in a ClipRRect');

    // fit reaches at least one image as BoxFit.cover.
    expect(
      images(tester).map((i) => i.fit),
      contains(BoxFit.cover),
      reason: 'the fit prop should reach the Image widget',
    );

    // The tinted image carries a color with the default srcIn blend mode.
    final tinted = images(tester).where((i) => i.color != null).toList();
    expect(tinted, isNotEmpty, reason: 'the color prop should reach the widget');
    expect(tinted.first.colorBlendMode, BlendMode.srcIn,
        reason: 'color defaults to a srcIn tint');
  });
}
