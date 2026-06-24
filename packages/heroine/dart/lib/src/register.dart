import 'package:solid_fuse/solid_fuse.dart';

import 'handles/heroine_controller.dart';
import 'pages/heroine_page.dart';
import 'widgets/drag_dismissable.dart';
import 'widgets/heroine.dart';

/// Registers the heroine native widgets/pages/handles with the Fuse runtime.
/// Wired automatically by `fuse link` (do not call manually).
void register(FuseRuntime runtime) {
  runtime.registerWidget('heroine', FuseHeroine.new);
  runtime.registerWidget('dragDismissable', FuseDragDismissable.new);
  runtime.registerHandle('heroinePage', FuseHeroinePage.new);
  runtime.registerHandle('heroineController', FuseHeroineController.new);
}
