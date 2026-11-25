import 'channels.dart';

/// Abstract connection to a Fuse JS runtime.
abstract class FuseConnection {
  /// Create the JS engine and channels. Does NOT evaluate user JS.
  Future<void> connect();

  /// Evaluate the JS entry point. Call after registering channel handlers.
  Future<void> start();

  /// Re-evaluate the JS entry point (e.g. after hot restart).
  Future<void> restart();

  /// Called when the connection swaps in a new JS engine (a full reload in
  /// dev) before it runs the entry again: new [channels], and JS that knows
  /// none of the old nodes.
  void Function()? onEngineReplaced;

  void dispose();

  /// The channel system for this connection.
  FuseChannels? get channels;

  /// Whether this connection is ready to handle events.
  bool get isConnected;
}
