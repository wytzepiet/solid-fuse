import 'dart:async';

import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
// ignore: implementation_imports, depend_on_referenced_packages
import 'package:flutter_rust_bridge/src/misc/rust_opaque.dart';

import 'channels.dart';
import 'ws_manager.dart';

/// Return type for [createEngine].
typedef EngineResult = ({
  JsEngine engine,
  FuseWsManager wsManager,
  FuseChannels channels,
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
  // Bump the Arc ref count so native Drop never runs on Dart GC — QuickJS
  // still asserts in JS_FreeRuntime when gc_obj_list is non-empty.
  // See https://github.com/fluttercandies/fjs/issues/8
  _preventNativeDrop(engine);

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
            // Drain after return: once Rust resolves the Promise from our
            // JsResult, QuickJS has a pending await-resumption microtask
            // that nothing else pumps. Direct await would deadlock (we'd
            // block on our own return value).
            scheduleMicrotask(() => drainImmediateJobs(engine));
            return JsResult.ok(
              result == null ? JsValue.none() : JsValue.from(result),
            );
          } catch (e, st) {
            scheduleMicrotask(() => drainImmediateJobs(engine));
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
      ' brightness: "${_fuseBrightnessName()}"'
      ' };',
    ),
  );

  // Forward OS light/dark changes to JS so host.brightness() stays reactive.
  _installFuseBrightnessObserver(channels);

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

  // Start fjs's event-driven background driver so async work that completes
  // without a bridge event (fetch, setTimeout, …) resolves promptly. This is
  // the native primitive that replaces the old blind-poll job pump: it parks
  // when idle and only wakes when a background future becomes runnable, while
  // yielding cooperatively so bridge calls still interleave.
  await engine.startDrive();

  return (engine: engine, wsManager: wsManager, channels: channels);
}

/// Creates a minimal engine for testing.
Future<JsEngine> createTestEngine() async {
  final (:engine, :wsManager, :channels) = await createEngine();
  return engine;
}

/// Increment the Arc reference count so that when Dart GC finalizes the
/// object, the native Drop doesn't run (prevents QuickJS SIGABRT).
void _preventNativeDrop(Object obj) {
  if (obj is RustOpaque) {
    // ignore: invalid_use_of_internal_member
    obj.frbInternalCstEncode(move: false);
  }
}

/// Keeps references to abandoned engines so they aren't GC'd.
/// Only accumulates during HMR reloads in dev mode.
final retiredEngines = <Object>[];

/// Drains the QuickJS job queue so that pending Promises resolve.
/// Uses `idle()`, which only returns once the runtime is fully quiescent —
/// i.e. no queued jobs AND no spawned futures remain. A live app is never
/// quiescent (the WebSocket stays open, timers stay scheduled), so this never
/// returns there. Use [drainImmediateJobs] for synchronous draining and
/// `engine.startDrive()` for the event-driven background driver; reserve
/// `idle()` for teardown or tests.
Future<void> drainJobs(JsEngine engine) async {
  await engine.idle();
}

/// Drains only the immediately-pending jobs (microtasks, resolved Promises)
/// without waiting for long-lived async operations like WebSocket connections.
Future<void> drainImmediateJobs(JsEngine engine) async {
  // executePendingJob returns true if a job was executed.
  // Run in a tight loop until no more immediate jobs are pending.
  while (await engine.executePendingJob()) {}
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

/// Forwards OS light/dark changes to JS. Its sender is refreshed on each
/// [createEngine] so it always targets the live channels (the engine may be
/// recreated on HMR reconnect), while the observer is added to the binding once.
class _FuseBrightnessObserver with WidgetsBindingObserver {
  void Function(String value)? send;

  @override
  void didChangePlatformBrightness() => send?.call(_fuseBrightnessName());
}

final _fuseBrightnessObserver = _FuseBrightnessObserver();
bool _fuseBrightnessObserverInstalled = false;

void _installFuseBrightnessObserver(FuseChannels channels) {
  _fuseBrightnessObserver.send = (value) =>
      channels.send('_brightness', <String, dynamic>{'value': value});
  if (!_fuseBrightnessObserverInstalled) {
    WidgetsBinding.instance.addObserver(_fuseBrightnessObserver);
    _fuseBrightnessObserverInstalled = true;
  }
}

// --- Job pump ---
//
// fjs builds on rquickjs's async runtime; async builtins like `fetch` and
// `setTimeout` are Rust-side background futures. Work that completes WITHOUT a
// bridge event used to have nothing to resume it — its continuation sat until
// the next unrelated bridge event (e.g. a ~15s WebSocket ping) happened to pump
// it, so `fetch` took ~15s instead of the network's ~100ms.
//
// This was previously worked around with a 33ms blind poll (_FuseJobPump). It
// is now handled inside fjs by an event-driven background driver, started via
// `engine.startDrive()` in createEngine (and stopped by the engine on close).
// The driver parks when idle and wakes only when a background future becomes
// runnable. See https://github.com/fluttercandies/fjs/pull/12 and the
// `startDrive`/`stopDrive` primitives.
