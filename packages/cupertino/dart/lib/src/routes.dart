import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `<Modal type="cupertinoDialog">`: what `showCupertinoDialog` pushes.
Route<Object?> cupertinoDialogRoute(BuildContext context, FuseNode node, WidgetBuilder content) {
  return CupertinoDialogRoute<Object?>(
    context: context,
    builder: content,
    barrierDismissible: node.bool('dismissible') ?? false,
    barrierLabel: node.string('barrierLabel'),
    barrierColor: node.value<Color>('barrierColor'),
  );
}

/// `<Modal type="cupertinoActionSheet">`: what `showCupertinoModalPopup`
/// pushes; the content slides up from the bottom.
Route<Object?> cupertinoPopupRoute(BuildContext context, FuseNode node, WidgetBuilder content) {
  return CupertinoModalPopupRoute<Object?>(
    builder: content,
    barrierDismissible: node.bool('dismissible') ?? true,
    barrierLabel: node.string('barrierLabel') ?? 'Dismiss',
    barrierColor: node.value<Color>('barrierColor') ?? kCupertinoModalBarrierColor,
  );
}
