import 'dart:async';

import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
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

/// Creates a new fjs runtime with the Arc ref count bumped to prevent
/// QuickJS SIGABRT on hot restart. One runtime per connection lifetime.
Future<JsAsyncRuntime> createRuntime({
  JsBuiltinOptions? builtin,
  List<JsModule>? additional,
}) async {
  final runtime = await JsAsyncRuntime.withOptions(
    builtin: builtin ?? JsBuiltinOptions.all(),
    additional: additional,
  );
  _preventNativeDrop(runtime);
  return runtime;
}

/// Creates a new context + engine on an existing runtime, with the
/// channel system, console shim, and WebSocket manager wired up.
///
/// Registers engine-level channels (`log`, `ws`). The caller is responsible
/// for registering app-level channels (`ops`, `nav`) before evaluating user JS.
Future<EngineResult> createEngine({
  required JsAsyncRuntime runtime,
}) async {
  // Late-init: the bridge closure captures channels, we register handlers after.
  late final FuseChannels channels;

  final context = await JsAsyncContext.from(runtime: runtime);
  final engine = JsEngine(context: context);

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
            scheduleMicrotask(() => drainImmediateJobs(runtime));
            return JsResult.ok(
              result == null ? JsValue.none() : JsValue.from(result),
            );
          } catch (e, st) {
            scheduleMicrotask(() => drainImmediateJobs(runtime));
            return JsResult.err(JsError.runtime('$e\n$st'));
          }
        }
      }
      return const JsResult.ok(JsValue.none());
    },
  );

  channels = FuseChannels(engine: engine, runtime: runtime);

  final wsManager = FuseWsManager(channels: channels);

  // Register engine-level channels
  channels.on('_log', (data) => debugPrint('[Fuse JS] ${data['message']}'));
  channels.on('_ws', (data) => wsManager.handleBridgeCall(data));

  final flutterMode = kReleaseMode
      ? 'release'
      : kProfileMode
          ? 'profile'
          : 'development';

  await engine.eval(
    source: JsCode.code('globalThis.flutterMode = "$flutterMode";'),
  );

  // Console shim using channels.send from JS side
  await engine.eval(
    source: JsCode.code(
      'globalThis.console = {'
      ' log: (...a) => fjs.bridge_call({ channel: "_log", message: a.join(" ") }),'
      ' warn: (...a) => fjs.bridge_call({ channel: "_log", message: "[WARN] " + a.join(" ") }),'
      ' error: (...a) => fjs.bridge_call({ channel: "_log", message: "[ERROR] " + a.join(" ") }),'
      ' info: (...a) => fjs.bridge_call({ channel: "_log", message: a.join(" ") })'
      ' };',
    ),
  );

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

  return (engine: engine, wsManager: wsManager, channels: channels);
}

/// Creates a minimal engine for testing.
Future<JsEngine> createTestEngine({required JsAsyncRuntime runtime}) async {
  final (:engine, :wsManager, :channels) = await createEngine(
    runtime: runtime,
  );
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
/// Uses `idle()` which waits until the runtime is fully quiescent.
/// WARNING: This will deadlock if long-lived Promises are pending (e.g.
/// WebSocket connections). Use [drainImmediateJobs] after entry evaluation.
Future<void> drainJobs(JsAsyncRuntime runtime) async {
  await runtime.idle();
}

/// Drains only the immediately-pending jobs (microtasks, resolved Promises)
/// without waiting for long-lived async operations like WebSocket connections.
Future<void> drainImmediateJobs(JsAsyncRuntime runtime) async {
  // executePendingJob returns true if a job was executed.
  // Run in a tight loop until no more immediate jobs are pending.
  while (await runtime.executePendingJob()) {}
}
