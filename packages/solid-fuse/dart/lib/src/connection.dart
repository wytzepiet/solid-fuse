import 'channels.dart';

/// Abstract connection to a Fuse JS runtime.
abstract class FuseConnection {
  /// Create the JS engine and channels. Does NOT evaluate user JS.
  Future<void> connect();

  /// Evaluate the JS entry point. Call after registering channel handlers.
  Future<void> start();

  /// Re-evaluate the JS entry point (e.g. after hot restart).
  Future<void> restart();

  void dispose();

  /// The channel system for this connection.
  FuseChannels? get channels;

  /// Whether this connection is ready to handle events.
  bool get isConnected;
}
