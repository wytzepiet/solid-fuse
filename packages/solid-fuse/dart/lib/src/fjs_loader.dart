// The web has no fjs: the bundle runs in the browser's own JS engine
// (web_connection.dart), so there is nothing to load.
export 'fjs_loader_io.dart' if (dart.library.js_interop) 'fjs_loader_web.dart';
