import 'package:material_ui/material_ui.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// `<TextField>` of `@solid-fuse/material`: Material's [TextField], with
/// core's text props (`value`/`onChange`, keyboard, formatters) and the
/// decoration as flat props (`label`, `placeholder`, `helper`, `error`,
/// `variant`...).
class FuseMaterialTextField extends StatefulWidget {
  const FuseMaterialTextField(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseMaterialTextField> createState() => _FuseMaterialTextFieldState();
}

class _FuseMaterialTextFieldState extends State<FuseMaterialTextField> {
  late final FuseControlledText _text = FuseControlledText(widget.node);
  FocusNode? _ownFocus;

  FuseNode get node => widget.node;

  @override
  void didUpdateWidget(covariant FuseMaterialTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    _text.sync(node);
  }

  @override
  void dispose() {
    _text.dispose();
    _ownFocus?.dispose();
    super.dispose();
  }

  InputDecoration _decoration() {
    final variant = node.string('variant') ?? 'outlined';
    final error = node.string('error');
    return InputDecoration(
      labelText: node.string('label'),
      hintText: node.string('placeholder'),
      helperText: node.string('helper'),
      errorText: error == null || error.isEmpty ? null : error,
      prefixIcon: node.widget('prefixIcon'),
      suffixIcon: node.widget('suffixIcon'),
      prefixText: node.string('prefixText'),
      suffixText: node.string('suffixText'),
      counterText: (node.bool('showCounter') ?? false) ? null : '',
      filled: variant == 'filled',
      border: switch (variant) {
        'underline' || 'filled' => const UnderlineInputBorder(),
        'none' => InputBorder.none,
        _ => const OutlineInputBorder(),
      },
      isDense: node.bool('dense'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final focusNode = node.handle<FocusNode>('focusNode') ?? (_ownFocus ??= FocusNode());
    final onSubmit = node.callback('onSubmit');
    final keyboardType = node.string('keyboardType');
    final hints = node.list<String>('autofillHints');
    return TextField(
      controller: _text.controller,
      focusNode: focusNode,
      decoration: _decoration(),
      enabled: !(node.bool('disabled') ?? false),
      readOnly: node.bool('readOnly') ?? false,
      autofocus: node.bool('autofocus') ?? false,
      obscureText: node.bool('obscureText') ?? false,
      autocorrect: node.bool('autocorrect') ?? true,
      keyboardType: fuseKeyboardType(keyboardType),
      textInputAction: fuseInputAction(node.string('inputAction')),
      textCapitalization: fuseTextCapitalization(node.string('textCapitalization')),
      keyboardAppearance: fuseBrightness(node.string('keyboardAppearance')),
      textAlign: fuseTextAlign(node.string('textAlign')),
      maxLines: fuseMaxLines(node),
      minLines: node.int('minLines'),
      maxLength: node.int('maxLength'),
      inputFormatters: fuseInputFormatters(node, maxLength: false),
      autofillHints: hints,
      onChanged: _text.changed,
      onSubmitted: onSubmit == null ? null : (v) => onSubmit(v),
      onTapOutside: (_) => focusNode.unfocus(),
    );
  }
}
