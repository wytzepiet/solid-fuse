import 'dart:async';

import 'package:flutter/foundation.dart';

/// Channels: routed messaging between Dart and the app's JS.
///
/// Whatever runs the JS (QuickJS through fjs, or the browser) gives one
/// unrouted pipe each way. A channel string rides as the first field of every
/// message, and [dispatch] routes it to the handler registered with [on]. A
/// connection subclasses this with the two calls into JS.
abstract class FuseChannels {
  final Map<String, FutureOr<dynamic> Function(Map<String, dynamic>)>
      _handlers = {};

  /// Calls JS's `__dispatch` (src/channels.ts) and gives the handler's
  /// result, once it settles.
  @protected
  Future<Object?> callJs(String channel, Map<String, dynamic> data);

  /// Calls JS's `__dispatchSync` and gives its reply (`{result, ops}`).
  @protected
  Object? callJsSync(String channel, Map<String, dynamic> data);

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
      await callJs(channel, data);
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
  }) {
    final future = callJs(channel, data);
    if (timeout == null) return future;
    return future.timeout(
      timeout,
      onTimeout: () => throw ChannelTimeoutError(channel, timeout),
    );
  }

  /// Dart → JS call that blocks until the JS handler (registered with
  /// `onSync`) returns. For a value needed at once, such as a builder's
  /// widget during a frame. Returns `{result, ops}`: the handler's result and
  /// the ops it produced (see `syncOps` in renderer.ts).
  Object? callSync(String channel, Map<String, dynamic> data) => callJsSync(channel, data);
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
