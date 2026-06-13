import 'package:fjs/fjs.dart' show LibFjs;

bool _started = false;

/// Loads the fjs Rust library. Idempotent — safe to call repeatedly.
///
/// fjs ships as its own FFI plugin, so frb's generated loader finds the
/// bundled library by name on every platform; we just guard against a second
/// init. All FFI use goes through here (`FuseRuntime.create`, tests).
Future<void> initFjs() async {
  if (_started) return;
  _started = true;
  await LibFjs.init();
}
