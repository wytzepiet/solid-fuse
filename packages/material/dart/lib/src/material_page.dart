import 'package:material_ui/material_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `materialPage()`: a [MaterialPage], with the platform's Material page
/// transition. The content sits on a [Material] so ink and text styles work.
class FuseMaterialPage extends FusePageHandle {
  FuseMaterialPage(super.node);

  @override
  late final Page<dynamic> object = MaterialPage<dynamic>(
    key: pageKey,
    name: node.string('name'),
    fullscreenDialog: node.bool('fullscreenDialog') ?? false,
    maintainState: node.bool('maintainState') ?? true,
    child: Material(child: pageContent),
  );
}
