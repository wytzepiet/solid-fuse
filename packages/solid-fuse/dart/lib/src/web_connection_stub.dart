import 'channels.dart';
import 'connection.dart';

/// Runs the bundle in the browser's JS engine. Web only.
class WebConnection extends FuseConnection {
  WebConnection({String? devServer});

  @override
  Future<void> connect() => throw UnsupportedError('WebConnection runs on the web only');

  @override
  Future<void> start() async {}

  @override
  Future<void> restart() async {}

  @override
  void dispose() {}

  @override
  FuseChannels? get channels => null;

  @override
  bool get isConnected => false;
}
