import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:marionette_flutter/marionette_flutter.dart';

/// The binding a solid-fuse app starts with.
///
/// In debug and profile builds this is Marionette's binding, so an agent or
/// a script can drive the running app: tap, type, scroll, take screenshots
/// and read logs (`fuse drive`). Everything printed with `debugPrint` (the
/// JS console, errors) is what `fuse drive get-logs` returns. Release builds
/// get the plain [WidgetsFlutterBinding]; Marionette is compiled out.
abstract final class FuseBinding {
  /// Call first in `main`, in place of
  /// `WidgetsFlutterBinding.ensureInitialized()`.
  static WidgetsBinding ensureInitialized() {
    if (kReleaseMode) return WidgetsFlutterBinding.ensureInitialized();
    // Initialized already (a test binding, or a second call): keep it.
    if (_existing() case final binding?) return binding;
    final logs = PrintLogCollector();
    final print = debugPrint;
    debugPrint = (String? message, {int? wrapWidth}) {
      print(message, wrapWidth: wrapWidth);
      if (message != null) logs.addLog(message);
    };
    return MarionetteBinding.ensureInitialized(
      MarionetteConfiguration(logCollector: logs),
    );
  }

  static WidgetsBinding? _existing() {
    try {
      return WidgetsBinding.instance;
    } catch (_) {
      return null;
    }
  }
}
