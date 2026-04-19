import 'dart:async';

import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';

import 'engine.dart';

/// Channels: routed messaging over FJS's raw bridge.
///
/// FJS provides one unrouted pipe in each direction. We add a channel string
/// as the first field of every message and dispatch to a handler registered
/// via [on]. FJS handles return values on both sides concurrently, so [call]
/// just awaits the FFI return.
class FuseChannels {
  FuseChannels({required this.engine, required this.runtime});

  final JsEngine engine;
  final JsAsyncRuntime runtime;
  final Map<String, FutureOr<dynamic> Function(Map<String, dynamic>)>
      _handlers = {};

  /// Register a handler for JS → Dart messages on this channel.
  /// The handler's return value flows back to JS as the call()'s result.
  void on(
    String channel,
    FutureOr<dynamic> Function(Map<String, dynamic> data) handler,
  ) {
    _handlers[channel] = handler;
  }

  /// Dispatch an incoming JS → Dart message (called from the bridge callback).
  /// Returns the handler's result (or null) so the bridge can forward it.
  Future<dynamic> dispatch(String channel, Map<String, dynamic> data) async {
    final h = _handlers[channel];
    if (h == null) return null;
    return await h(data);
  }

  /// Dart → JS message that discards the handler's return value.
  /// Returns a Future the caller can await for ordering, without the overhead
  /// of a timeout wrapper. Use [call] when you need the return value.
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

  /// RPC-style message Dart → JS. Awaits the registered JS handler's return.
  ///
  /// [timeout] defaults to 30s. Pass `null` to disable.
  Future<dynamic> call(
    String channel,
    Map<String, dynamic> data, {
    Duration? timeout = const Duration(seconds: 30),
  }) async {
    final future = engine
        .call(
          module: '__fuse_dispatch',
          method: 'dispatch',
          params: [JsValue.string(channel), JsValue.from(data)],
        )
        .then((JsValue result) async {
          await drainImmediateJobs(runtime);
          return result.value;
        });
    if (timeout == null) return future;
    return future.timeout(
      timeout,
      onTimeout: () => throw ChannelTimeoutError(channel, timeout),
    );
  }
}

/// Thrown when [FuseChannels.call] exceeds its timeout.
class ChannelTimeoutError implements Exception {
  ChannelTimeoutError(this.channel, this.timeout);
  final String channel;
  final Duration timeout;
  @override
  String toString() =>
      'ChannelTimeoutError: channels.call("$channel") timed out after '
      '${timeout.inMilliseconds}ms';
}
