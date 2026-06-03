/// Public re-export of the vendored fjs (QuickJS) runtime API.
///
/// fjs lives in-tree at `lib/src/fjs` — a git subtree mirror of
/// wytzepiet/fjs. solid_fuse is itself the FFI plugin that builds it, so the
/// runtime is exposed here instead of via a separate `package:fjs` dependency.
///
/// Import this (`package:solid_fuse/fjs.dart`) wherever you'd have used
/// `package:fjs/fjs.dart`.
library;

export 'src/fjs/lib/fjs.dart';

// solid_fuse-owned loader that handles the vendored library's per-platform
// linking (see fjs_loader.dart). Use this instead of LibFjs.init() directly.
export 'src/fjs_loader.dart' show initFjs;
