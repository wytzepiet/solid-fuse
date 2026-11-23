import 'package:solid_fuse/solid_fuse.dart';

import 'heroine_page.dart';

/// Registers `@solid-fuse/heroine`'s page type. `fuse link` calls it after
/// core's.
void registerHeroine(FuseRuntime runtime) {
  runtime.registerHandle('heroinePage', FuseHeroinePage.new);
}
