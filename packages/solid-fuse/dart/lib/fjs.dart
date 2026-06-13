/// Public re-export of the fjs (QuickJS) runtime API.
///
/// fjs is the published FFI plugin (`package:fjs`) that builds and ships the
/// Rust/QuickJS engine. We re-export it here so app code keeps importing
/// `package:solid_fuse/fjs.dart` as the single Fuse entry point.
library;

export 'package:fjs/fjs.dart';

// solid_fuse-owned init wrapper (see fjs_loader.dart). Use this instead of
// LibFjs.init() directly so library loading stays idempotent.
export 'src/fjs_loader.dart' show initFjs;
