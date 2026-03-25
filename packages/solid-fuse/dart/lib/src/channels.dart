import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';

import 'engine.dart';

/// Symmetric channel abstraction for Dart ↔ JS communication.
///
/// JS → Dart: dispatched via [dispatch] from the bridge callback.
/// Dart → JS: sent via [send], which calls `__dispatch` in JS (auto-flushes).
class FuseChannels {
  FuseChannels({required this.engine, required this.runtime});

  final JsEngine engine;
  final JsAsyncRuntime runtime;
  final Map<String, void Function(Map<String, dynamic>)> _handlers = {};

  /// Register a handler for JS → Dart messages on this channel.
  void on(String channel, void Function(Map<String, dynamic> data) handler) {
    _handlers[channel] = handler;
  }

  /// Dispatch an incoming JS → Dart message (called from bridge callback).
  void dispatch(String channel, Map<String, dynamic> data) {
    _handlers[channel]?.call(data);
  }

  /// Send a Dart → JS message via FFI (no JSON serialization).
  /// `__dispatch` auto-flushes; we just drain.
  Future<void> send(String channel, Map<String, dynamic> data) async {
    try {
      await engine.call(
        module: '__fuse_dispatch',
        method: 'dispatch',
        params: [JsValue.string(channel), JsValue.from(data)],
      );
      await drainImmediateJobs(runtime);
    } catch (e) {
      debugPrint('[Fuse] channels.send($channel) error: $e');
    }
  }
}
