import 'runtime.dart';

/// Base class for Fuse packages that register widgets with the runtime.
///
/// Third-party packages extend this and list their class name in
/// package.json under `"fuse": { "register": "MyPackage" }`.
/// The `fuse link` CLI generates code that calls [register] for each package.
abstract class FusePackage {
  void register(FuseRuntime runtime);
}
