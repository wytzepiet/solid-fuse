import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../controlled_text.dart';
import '../node.dart';
import '../text_options.dart';

/// `<textInput>`: text editing with no look of its own, on [EditableText].
/// The text is controlled by JS through `value` / `onChange`
/// ([FuseControlledText]); a placeholder shows while it is empty.
class FuseTextInput extends StatefulWidget {
  const FuseTextInput(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseTextInput> createState() => _FuseTextInputState();
}

class _FuseTextInputState extends State<FuseTextInput>
    implements TextSelectionGestureDetectorBuilderDelegate {
  late final FuseControlledText _text = FuseControlledText(widget.node);
  FocusNode? _ownFocus;
  late final TextSelectionGestureDetectorBuilder _gestures = TextSelectionGestureDetectorBuilder(delegate: this);

  @override
  final GlobalKey<EditableTextState> editableTextKey = GlobalKey<EditableTextState>();

  @override
  bool get forcePressEnabled => false;

  @override
  bool get selectionEnabled => !(widget.node.bool('disabled') ?? false);

  FocusNode get _focus => widget.node.handle<FocusNode>('focusNode') ?? (_ownFocus ??= FocusNode());

  @override
  void initState() {
    super.initState();
    _wasEmpty = _text.controller.text.isEmpty;
    _text.controller.addListener(_rebuildPlaceholder);
  }

  bool _wasEmpty = true;
  void _rebuildPlaceholder() {
    final empty = _text.controller.text.isEmpty;
    if (empty != _wasEmpty) setState(() => _wasEmpty = empty);
  }

  @override
  void didUpdateWidget(covariant FuseTextInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    _text.sync(widget.node);
  }

  @override
  void dispose() {
    _text.dispose();
    _ownFocus?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final disabled = node.bool('disabled') ?? false;
    final base = DefaultTextStyle.of(context).style;
    final style = base.merge(fuseTextStyle(node));
    final cursor = node.color('cursorColor') ?? style.color ?? const Color(0xFF2196F3);
    final align = fuseTextAlign(node.string('textAlign'));
    final maxLines = fuseMaxLines(node);
    final onSubmit = node.callback('onSubmit');
    final touch = switch (defaultTargetPlatform) {
      TargetPlatform.android || TargetPlatform.iOS || TargetPlatform.fuchsia => true,
      _ => false,
    };

    Widget editable = EditableText(
      key: editableTextKey,
      controller: _text.controller,
      focusNode: _focus,
      readOnly: disabled || (node.bool('readOnly') ?? false),
      autofocus: node.bool('autofocus') ?? false,
      obscureText: node.bool('obscureText') ?? false,
      autocorrect: node.bool('autocorrect') ?? true,
      enableSuggestions: node.bool('autocorrect') ?? true,
      style: style,
      cursorColor: cursor,
      backgroundCursorColor: const Color(0xFF9E9E9E),
      selectionColor: node.color('selectionColor') ?? cursor.withValues(alpha: 0.3),
      textAlign: align,
      maxLines: maxLines,
      minLines: node.int('minLines'),
      keyboardType: fuseKeyboardType(node.string('keyboardType')),
      textInputAction: fuseInputAction(node.string('inputAction')),
      textCapitalization: fuseTextCapitalization(node.string('textCapitalization')),
      keyboardAppearance: fuseBrightness(node.string('keyboardAppearance')) ?? Brightness.light,
      autofillHints: node.list<String>('autofillHints'),
      inputFormatters: fuseInputFormatters(node),
      rendererIgnoresPointer: true,
      onChanged: _text.changed,
      onSubmitted: onSubmit == null ? null : (v) => onSubmit(v),
      onTapOutside: (_) {
        if (touch) _focus.unfocus();
      },
    );

    final placeholder = node.string('placeholder');
    if (placeholder != null) {
      editable = Stack(
        children: [
          if (_text.controller.text.isEmpty)
            Positioned.fill(
              child: IgnorePointer(
                child: Text(
                  placeholder,
                  style: style.copyWith(color: node.color('placeholderColor') ?? const Color(0xFF9E9E9E)),
                  textAlign: align,
                  maxLines: maxLines ?? 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          editable,
        ],
      );
    }

    return Semantics(
      textField: true,
      enabled: !disabled,
      child: _gestures.buildGestureDetector(behavior: HitTestBehavior.translucent, child: editable),
    );
  }
}
