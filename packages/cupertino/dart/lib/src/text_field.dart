import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `<TextField>` of `@solid-fuse/cupertino`: [CupertinoTextField], with
/// core's text props (`value`/`onChange`, keyboard, formatters) plus
/// `placeholder`, `prefix`/`suffix` and a clear button.
class FuseCupertinoTextField extends StatefulWidget {
  const FuseCupertinoTextField(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseCupertinoTextField> createState() => _FuseCupertinoTextFieldState();
}

class _FuseCupertinoTextFieldState extends State<FuseCupertinoTextField> {
  late final FuseControlledText _text = FuseControlledText(widget.node);
  FocusNode? _ownFocus;

  FuseNode get node => widget.node;

  @override
  void didUpdateWidget(covariant FuseCupertinoTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    _text.sync(node);
  }

  @override
  void dispose() {
    _text.dispose();
    _ownFocus?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final focusNode = node.handle<FocusNode>('focusNode') ?? (_ownFocus ??= FocusNode());
    final onSubmit = node.callback('onSubmit');
    final borderless = node.string('variant') == 'borderless';
    final field = borderless ? CupertinoTextField.borderless : CupertinoTextField.new;
    return field(
      controller: _text.controller,
      focusNode: focusNode,
      placeholder: node.string('placeholder'),
      prefix: node.widget('prefix'),
      suffix: node.widget('suffix'),
      clearButtonMode: (node.bool('clearButton') ?? false) ? OverlayVisibilityMode.editing : OverlayVisibilityMode.never,
      enabled: !(node.bool('disabled') ?? false),
      readOnly: node.bool('readOnly') ?? false,
      autofocus: node.bool('autofocus') ?? false,
      obscureText: node.bool('obscureText') ?? false,
      autocorrect: node.bool('autocorrect') ?? true,
      keyboardType: fuseKeyboardType(node.string('keyboardType')),
      textInputAction: fuseInputAction(node.string('inputAction')),
      textCapitalization: fuseTextCapitalization(node.string('textCapitalization')),
      keyboardAppearance: fuseBrightness(node.string('keyboardAppearance')),
      textAlign: fuseTextAlign(node.string('textAlign')),
      maxLines: fuseMaxLines(node),
      minLines: node.int('minLines'),
      maxLength: node.int('maxLength'),
      inputFormatters: fuseInputFormatters(node, maxLength: false),
      autofillHints: node.list<String>('autofillHints'),
      onChanged: _text.changed,
      onSubmitted: onSubmit == null ? null : (v) => onSubmit(v),
      onTapOutside: (_) => focusNode.unfocus(),
    );
  }
}
