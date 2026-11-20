// Hand-written escape hatch for modal_bottom_sheet (class D: required BuildContext + imperative call).
// The package API is `showMaterialModalBottomSheet(context: context, builder: (context) => ...)`:
// a function that needs a BuildContext under a Navigator and returns when the sheet closes.
// This widget makes it declarative: `open` drives the route, `sheet` is its content.
import 'package:flutter/material.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';

class ModalSheet extends StatefulWidget {
  const ModalSheet({
    super.key,
    required this.open,
    required this.sheet,
    this.child,
    this.onClosed,
    this.expand = false,
    this.enableDrag = true,
    this.isDismissible = true,
    this.backgroundColor,
    this.barrierColor,
  });

  final bool open;
  final Widget sheet;
  final Widget? child;

  /// Called when the sheet is dismissed by the user. Set `open` to false in response.
  final VoidCallback? onClosed;
  final bool expand;
  final bool enableDrag;
  final bool isDismissible;
  final Color? backgroundColor;
  final Color? barrierColor;

  @override
  State<ModalSheet> createState() => _ModalSheetState();
}

class _ModalSheetState extends State<ModalSheet> {
  bool _showing = false;

  @override
  void initState() {
    super.initState();
    if (widget.open) WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
  }

  @override
  void didUpdateWidget(ModalSheet old) {
    super.didUpdateWidget(old);
    if (old.open != widget.open) WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
  }

  void _sync() {
    if (!mounted) return;
    if (widget.open && !_showing) {
      _showing = true;
      showMaterialModalBottomSheet<void>(
        context: context,
        expand: widget.expand,
        enableDrag: widget.enableDrag,
        isDismissible: widget.isDismissible,
        backgroundColor: widget.backgroundColor,
        barrierColor: widget.barrierColor,
        builder: (_) => widget.sheet,
      ).whenComplete(() {
        final byUser = _showing;
        _showing = false;
        if (byUser && mounted) widget.onClosed?.call();
      });
    } else if (!widget.open && _showing) {
      _showing = false;
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child ?? const SizedBox.shrink();
}
