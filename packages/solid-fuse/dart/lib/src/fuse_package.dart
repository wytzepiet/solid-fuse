import 'runtime.dart';

/// Signature for a Fuse package registration function.
///
/// Packages export a top-level function matching this signature and list
/// its name in `fuse.config.ts` under `register`.
/// The `fuse link` CLI generates code that calls each package's function.
typedef FusePackageRegister = void Function(FuseRuntime runtime);
