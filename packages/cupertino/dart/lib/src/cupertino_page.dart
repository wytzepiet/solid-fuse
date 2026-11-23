import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `cupertinoPage()`: a [CupertinoPage], sliding in from the right with the
/// iOS back swipe. `title` feeds the next page's back button.
class FuseCupertinoPage extends FusePageHandle {
  FuseCupertinoPage(super.node);

  @override
  late final Page<dynamic> object = CupertinoPage<dynamic>(
    key: pageKey,
    name: node.string('name'),
    title: node.string('title'),
    fullscreenDialog: node.bool('fullscreenDialog') ?? false,
    maintainState: node.bool('maintainState') ?? true,
    child: pageContent,
  );
}
