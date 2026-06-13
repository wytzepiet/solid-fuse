import 'dart:async';
import 'dart:convert';
import 'dart:ui' show ViewPadding;

import 'package:solid_fuse/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'channels.dart';
import 'ws_manager.dart';

/// Return type for [createEngine].
typedef EngineResult = ({
  JsEngine engine,
  FuseWsManager wsManager,
  FuseChannels channels,
  WidgetsBindingObserver hostObserver,
});

/// Creates a new engine with the channel system, console shim, and WebSocket
/// manager wired up.
///
/// Registers engine-level channels (`log`, `ws`). The caller is responsible
/// for registering app-level channels (`ops`, `nav`) before evaluating user JS.
Future<EngineResult> createEngine({
  JsBuiltinOptions? builtins,
  List<JsModule>? modules,
}) async {
  // Late-init: the bridge closure captures channels, we register handlers after.
  late final FuseChannels channels;

  final engine = await JsEngine.create(
    builtins: builtins ?? JsBuiltinOptions.all(),
    modules: modules,
  );

  await engine.init(
    bridge: (jsValue) async {
      final data = jsValue.value;
      if (data is Map) {
        final channel = data['channel'] as String?;
        if (channel != null) {
          final payload = Map<String, dynamic>.from(data);
          payload.remove('channel');
          try {
            final result = await channels.dispatch(channel, payload);
            // No manual drain: fjs 3.0's async runtime drives its own background
            // jobs, so the await-resumption microtask after Rust resolves this
            // Promise gets pumped automatically.
            return JsResult.ok(
              result == null ? JsValue.none() : JsValue.from(result),
            );
          } catch (e, st) {
            return JsResult.err(JsError.runtime('$e\n$st'));
          }
        }
      }
      return const JsResult.ok(JsValue.none());
    },
  );

  channels = FuseChannels(engine: engine);

  final wsManager = FuseWsManager(channels: channels);

  // Register engine-level channels
  channels.on('_log', (data) => debugPrint('[Fuse JS] ${data['message']}'));
  channels.on('_ws', (data) => wsManager.handleBridgeCall(data));

  final mode = kReleaseMode
      ? 'release'
      : kProfileMode
          ? 'profile'
          : 'debug';

  // Seed ambient host facts under one global for the `host` JS namespace
  // (read by src/host.ts). Sourced from foundation/dart:ui only — no
  // Material/Cupertino — so it survives the design-system package split.
  await engine.eval(
    source: JsCode.code(
      'globalThis.__fuseHost = {'
      ' mode: "$mode",'
      ' platform: "${_fusePlatformName()}",'
      ' brightness: "${_fuseBrightnessName()}",'
      ' metrics: ${jsonEncode(_fuseMetrics())}'
      ' };',
    ),
  );

  // Forward OS theme/metrics changes to JS so the reactive `host` members
  // (brightness, size, insets, …) stay live. One observer per engine;
  // retireEngine removes it from the binding.
  final hostObserver = _FuseHostObserver(channels);
  WidgetsBinding.instance.addObserver(hostObserver);

  // NB: the `console` shim lives in the JS package (src/polyfills.ts), not here —
  // it's a standard-global polyfill with no Dart dependency, alongside
  // structuredClone/URL/WebSocket. The Dart side only owns the `_log` channel
  // handler (registered above) that prints what the shim sends.

  // Declare a shim module so channels.send() can use engine.call() with typed
  // JsValue params (FFI, no JSON serialization) instead of eval + jsonEncode.
  // Must be declared before user code runs, since __dispatch is set during
  // solid-fuse initialisation which happens inside user module evaluation.
  await engine.declareNewModule(
    module: JsModule.code(
      module: '__fuse_dispatch',
      code: 'export function dispatch(ch, data) { return globalThis.__dispatch(ch, data); }',
    ),
  );

  return (
    engine: engine,
    wsManager: wsManager,
    channels: channels,
    hostObserver: hostObserver,
  );
}

/// Creates a minimal engine for testing.
Future<JsEngine> createTestEngine() async {
  final (:engine, :wsManager, :channels, :hostObserver) =
      await createEngine();
  return engine;
}

/// Retires an engine on HMR/hot-restart: remove its brightness observer, close
/// its sockets, free the runtime. `close()` is safe (fjs handles drop without a
/// prior close) — we used to keep dead engines alive forever, leaking a QuickJS
/// runtime per reload.
Future<void> retireEngine(
  JsEngine engine,
  FuseWsManager wsManager,
  WidgetsBindingObserver hostObserver,
) async {
  WidgetsBinding.instance.removeObserver(hostObserver);
  wsManager.dispose();
  await engine.close();
}

// --- `host` namespace: ambient platform/brightness facts ---
// Read-only facts sourced from foundation/dart:ui (never Material/Cupertino),
// surfaced to JS via the `host` object in src/host.ts.

String _fusePlatformName() {
  if (kIsWeb) return 'web';
  return switch (defaultTargetPlatform) {
    TargetPlatform.android => 'android',
    TargetPlatform.iOS => 'ios',
    TargetPlatform.macOS => 'macos',
    TargetPlatform.windows => 'windows',
    TargetPlatform.linux => 'linux',
    TargetPlatform.fuchsia => 'fuchsia',
  };
}

String _fuseBrightnessName() =>
    WidgetsBinding.instance.platformDispatcher.platformBrightness ==
            Brightness.dark
        ? 'dark'
        : 'light';

/// Snapshot of the implicit view's media-query metrics, in logical pixels —
/// the source for the reactive `host.size()`, `host.padding()`, etc. Read from
/// the FlutterView + PlatformDispatcher (never a BuildContext or MediaQuery), so
/// it works before any widget tree exists and survives the design-system split.
Map<String, dynamic> _fuseMetrics() {
  final dispatcher = WidgetsBinding.instance.platformDispatcher;
  final view = dispatcher.implicitView;
  Map<String, double> zero() =>
      {'top': 0, 'right': 0, 'bottom': 0, 'left': 0};

  if (view == null) {
    return {
      'width': 0.0,
      'height': 0.0,
      'devicePixelRatio': 1.0,
      'padding': zero(),
      'viewInsets': zero(),
      'viewPadding': zero(),
      'textScaleFactor': dispatcher.textScaleFactor,
    };
  }

  final dpr = view.devicePixelRatio;
  Map<String, double> insets(ViewPadding p) => {
        'top': p.top / dpr,
        'right': p.right / dpr,
        'bottom': p.bottom / dpr,
        'left': p.left / dpr,
      };

  return {
    'width': view.physicalSize.width / dpr,
    'height': view.physicalSize.height / dpr,
    'devicePixelRatio': dpr,
    'padding': insets(view.padding),
    'viewInsets': insets(view.viewInsets),
    'viewPadding': insets(view.viewPadding),
    'textScaleFactor': dispatcher.textScaleFactor,
  };
}

/// Forwards OS theme and view-metric changes to its engine's channels so the
/// reactive `host` members stay live. One per engine; createEngine adds it,
/// retireEngine removes it.
class _FuseHostObserver with WidgetsBindingObserver {
  _FuseHostObserver(this._channels);

  final FuseChannels _channels;

  @override
  void didChangePlatformBrightness() => _channels
      .send('_brightness', <String, dynamic>{'value': _fuseBrightnessName()});

  @override
  void didChangeMetrics() => _channels.send('_metrics', _fuseMetrics());

  @override
  void didChangeTextScaleFactor() =>
      _channels.send('_metrics', _fuseMetrics());
}
