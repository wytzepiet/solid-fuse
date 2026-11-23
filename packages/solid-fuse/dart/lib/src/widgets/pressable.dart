import 'package:flutter/widgets.dart';

import '../node.dart';

/// `<pressable>`: something the user activates, with no look of its own.
/// Tap, long press, Enter/Space when focused, a button to assistive tech.
/// Reports pressed / hovered / focused to JS (`onPressedChange`,
/// `onHoveredChange`, `onFocusedChange`), each only when JS listens, and
/// can dim itself while pressed without a round trip (`pressedOpacity`).
class FusePressable extends StatefulWidget {
  const FusePressable(this.node, {super.key});

  final FuseNode node;

  @override
  State<FusePressable> createState() => _FusePressableState();
}

class _FusePressableState extends State<FusePressable> {
  bool _pressed = false;
  bool _hovered = false;
  bool _focused = false;

  FuseNode get node => widget.node;
  bool get _enabled => !(node.bool('disabled') ?? false);

  void _set({bool? pressed, bool? hovered, bool? focused}) {
    final p = pressed ?? _pressed, h = hovered ?? _hovered, f = focused ?? _focused;
    if (p == _pressed && h == _hovered && f == _focused) return;
    final changed = [
      if (p != _pressed) ('onPressedChange', p),
      if (h != _hovered) ('onHoveredChange', h),
      if (f != _focused) ('onFocusedChange', f),
    ];
    setState(() {
      _pressed = p;
      _hovered = h;
      _focused = f;
    });
    for (final (name, value) in changed) {
      node.callback(name)?.call(value);
    }
  }

  void _press() {
    if (!_enabled) return;
    node.callback('onPress')?.call();
  }

  @override
  void didUpdateWidget(covariant FusePressable oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Disabled while held: nothing is pressed any more.
    if (!_enabled && (_pressed || _hovered)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _set(pressed: false, hovered: false);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = _enabled;
    final onLongPress = node.callback('onLongPress');
    final pressedOpacity = node.double('pressedOpacity');
    Widget child = node.flexChildren;
    if (pressedOpacity != null) {
      child = AnimatedOpacity(
        opacity: _pressed ? pressedOpacity.clamp(0.0, 1.0) : 1,
        duration: Duration(milliseconds: _pressed ? 0 : 150),
        child: child,
      );
    }
    return FocusableActionDetector(
      enabled: enabled,
      focusNode: node.handle<FocusNode>('focusNode'),
      autofocus: node.bool('autofocus') ?? false,
      mouseCursor: enabled ? SystemMouseCursors.click : MouseCursor.defer,
      onShowHoverHighlight: (v) => _set(hovered: v),
      onShowFocusHighlight: (v) => _set(focused: v),
      actions: <Type, Action<Intent>>{
        ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) => _press()),
        ButtonActivateIntent: CallbackAction<ButtonActivateIntent>(onInvoke: (_) => _press()),
      },
      child: Semantics(
        button: true,
        enabled: enabled,
        label: node.string('semanticLabel'),
        onTap: enabled ? _press : null,
        onLongPress: enabled && onLongPress != null ? () => onLongPress() : null,
        excludeSemantics: node.string('semanticLabel') != null,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: enabled ? (_) => _set(pressed: true) : null,
          onTapUp: enabled ? (_) => _set(pressed: false) : null,
          onTapCancel: enabled ? () => _set(pressed: false) : null,
          onTap: enabled ? _press : null,
          onLongPress: enabled && onLongPress != null
              ? () {
                  _set(pressed: false);
                  onLongPress();
                }
              : null,
          child: child,
        ),
      ),
    );
  }
}
