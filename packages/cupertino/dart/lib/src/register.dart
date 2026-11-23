import 'package:solid_fuse/solid_fuse.dart';

import 'cupertino_page.dart';
import 'routes.dart';
import 'segmented_control.dart';
import 'text_field.dart';

/// Registers `@solid-fuse/cupertino`'s hand-written pieces. `fuse link`
/// calls it after core's.
void registerCupertino(FuseRuntime runtime) {
  runtime.registerWidget('cupertinoTextField', FuseCupertinoTextField.new);
  runtime.registerWidget('cupertinoSegmentedControl', FuseCupertinoSegmentedControl.new);
  runtime.registerHandle('cupertinoPage', FuseCupertinoPage.new);
  runtime.registerRoute('cupertinoDialog', cupertinoDialogRoute);
  runtime.registerRoute('cupertinoActionSheet', cupertinoPopupRoute);
}
