import 'package:material_ui/material_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `<Modal type="materialDialog">`: what `showDialog` pushes. The content is
/// the dialog (an `AlertDialog`, a `Dialog`).
Route<Object?> materialDialogRoute(BuildContext context, FuseNode node, WidgetBuilder content) {
  return DialogRoute<Object?>(
    context: context,
    builder: content,
    barrierDismissible: node.bool('dismissible') ?? true,
    barrierColor: node.value<Color>('barrierColor') ?? Colors.black54,
    barrierLabel: node.string('barrierLabel'),
    useSafeArea: node.bool('useSafeArea') ?? true,
  );
}

/// `<Modal type="materialBottomSheet">`: what `showModalBottomSheet`
/// pushes. The content goes on the sheet.
Route<Object?> materialBottomSheetRoute(BuildContext context, FuseNode node, WidgetBuilder content) {
  final navigator = Navigator.of(context, rootNavigator: node.bool('useRootNavigator') ?? true);
  return ModalBottomSheetRoute<Object?>(
    builder: content,
    capturedThemes: InheritedTheme.capture(from: context, to: navigator.context),
    isScrollControlled: node.bool('scrollControlled') ?? false,
    isDismissible: node.bool('dismissible') ?? true,
    enableDrag: node.bool('enableDrag') ?? true,
    showDragHandle: node.bool('showDragHandle'),
    backgroundColor: node.value<Color>('backgroundColor'),
    barrierLabel: node.string('barrierLabel'),
    modalBarrierColor: node.value<Color>('barrierColor'),
    useSafeArea: node.bool('useSafeArea') ?? false,
  );
}
