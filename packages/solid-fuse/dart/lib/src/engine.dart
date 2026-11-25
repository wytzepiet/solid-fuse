import 'dart:async';
import 'dart:convert';

import 'package:solid_fuse/fjs.dart';
import 'package:flutter/widgets.dart';

import 'channels.dart';
import 'host.dart';
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

  channels = QuickJsChannels(engine);

  final wsManager = FuseWsManager(channels: channels);

  // Sockets go through Dart: QuickJS has no WebSocket (src/polyfills.ts).
  channels.on('_ws', (data) => wsManager.handleBridgeCall(data));

  final (:host, :observer) = await setUpHost(channels);
  await engine.eval(source: JsCode.code('globalThis.__fuseHost = ${jsonEncode(host)};'));
  final hostObserver = observer;

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
      // The result rides in an array: fjs unwraps an async result that is an
      // object with only a `value` key (the wrapper of an async eval), and a
      // channel's reply may be just that (`{ value }`).
      code: 'export async function dispatch(ch, data) { return [await globalThis.__dispatch(ch, data)]; }\n'
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

/// Channels over an fjs [JsEngine] (QuickJS): calls go through the
/// `__fuse_dispatch` module [createEngine] declares.
class QuickJsChannels extends FuseChannels {
  QuickJsChannels(this.engine);

  final JsEngine engine;

  @override
  Future<Object?> callJs(String channel, Map<String, dynamic> data) => engine
      .call(
        module: '__fuse_dispatch',
        method: 'dispatch',
        params: [JsValue.string(channel), JsValue.from(data)],
      )
      // In an array: see the module.
      .then((JsValue result) => (result.value as List).first);

  @override
  Object? callJsSync(String channel, Map<String, dynamic> data) => engine
      .callSync(
        module: '__fuse_dispatch',
        method: 'dispatchSync',
        params: [JsValue.string(channel), JsValue.from(data)],
      )
      .value;
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
