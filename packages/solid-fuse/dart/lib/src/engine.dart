import 'dart:async';
import 'dart:convert';

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
            // No manual drain: once Rust resolves the Promise from our JsResult,
            // fjs's background driver wakes and pumps the await-resumption
            // microtask. fjs 3.x starts the driver at init and notifies it after
            // every foreground call; a manual drain here would evict its waker
            // and break detached async.
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
      'globalThis.__fuseHost = ${jsonEncode({
        'mode': mode,
        'platform': _fusePlatformName(),
        'brightness': _fuseBrightnessName(),
        'view': fuseViewMetrics(),
      })};',
    ),
  );

  // Forward OS light/dark and view changes to JS so host's accessors stay
  // reactive. One observer per engine; retireEngine removes it from the
  // binding.
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
      code: 'export function dispatch(ch, data) { return globalThis.__dispatch(ch, data); }\n'
          'export function dispatchSync(ch, data) { return globalThis.__dispatchSync(ch, data); }',
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
/// its sockets, free the runtime (`close()` also stops fjs's background
/// driver and cancels in-flight calls with `JsError.cancelled`). We used to
/// keep dead engines alive forever, leaking a QuickJS runtime per reload.
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

/// The app's view as `host` reports it (src/host.ts), in logical pixels: what
/// `MediaQuery` would say at the root. The implicit view, or the first.
@visibleForTesting
Map<String, Object?> fuseViewMetrics() {
  final dispatcher = WidgetsBinding.instance.platformDispatcher;
  final view = dispatcher.implicitView ?? dispatcher.views.firstOrNull;
  if (view == null) return const {};
  final data = MediaQueryData.fromView(view);
  Map<String, double> insets(EdgeInsets e) => {'left': e.left, 'top': e.top, 'right': e.right, 'bottom': e.bottom};
  return {
    'size': {'width': data.size.width, 'height': data.size.height},
    'devicePixelRatio': data.devicePixelRatio,
    'padding': insets(data.padding),
    'viewInsets': insets(data.viewInsets),
    'viewPadding': insets(data.viewPadding),
    'textScale': data.textScaler.scale(1),
  };
}

/// Forwards OS light/dark and view changes (size, insets, text scale) to its
/// engine's channels so `host`'s accessors stay reactive. One per engine;
/// createEngine adds it, retireEngine removes it.
class _FuseHostObserver with WidgetsBindingObserver {
  _FuseHostObserver(this._channels);

  final FuseChannels _channels;

  @override
  void didChangePlatformBrightness() => _channels
      .send('_brightness', <String, dynamic>{'value': _fuseBrightnessName()});

  @override
  void didChangeMetrics() => _channels.send('_view', fuseViewMetrics());

  @override
  void didChangeTextScaleFactor() => _channels.send('_view', fuseViewMetrics());
}

// --- Job pump ---
//
// fjs builds on rquickjs's async runtime; async builtins like `fetch` and
// `setTimeout` are Rust-side background futures. Work that completes WITHOUT a
// bridge event used to have nothing to resume it — its continuation sat until
// the next unrelated bridge event (e.g. a ~15s WebSocket ping) happened to pump
// it, so `fetch` took ~15s instead of the network's ~100ms.
//
// This was previously worked around with a 33ms blind poll (_FuseJobPump), then
// by the fork's explicit `engine.startDrive()`. Since fjs 3.x the event-driven
// background driver is internal: it starts with `engine.init()`, parks when
// idle, wakes when a background future becomes runnable (with a 1s defensive
// fallback tick), and is notified after every foreground call. `close()` stops
// it. See fluttercandies/fjs 4ba9291.
