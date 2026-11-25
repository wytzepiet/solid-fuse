// The browser runs the bundle itself; elsewhere QuickJS does
// (quickjs_connection.dart), so this connection exists on the web only.
export 'web_connection_stub.dart' if (dart.library.js_interop) 'web_connection_web.dart';
