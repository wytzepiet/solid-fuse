import 'package:solid_fuse/solid_fuse.dart';

import 'material_page.dart';
import 'routes.dart';
import 'text_field.dart';

/// Registers `@solid-fuse/material`'s hand-written pieces. `fuse link`
/// calls it after core's.
void registerMaterial(FuseRuntime runtime) {
  runtime.registerWidget('materialTextField', FuseMaterialTextField.new);
  runtime.registerHandle('materialPage', FuseMaterialPage.new);
  runtime.registerRoute('materialDialog', materialDialogRoute);
  runtime.registerRoute('materialBottomSheet', materialBottomSheetRoute);
}
