/// The first paragraph of a `///` doc comment, without dartdoc directives
/// (`{@tool}` blocks, `{@template}`, `{@macro}`, ...). Null when empty.
String? firstParagraph(String? raw) {
  if (raw == null) return null;
  final out = <String>[];
  var skip = false;
  for (final line in raw.split('\n')) {
    final l = line.replaceFirst(RegExp(r'^\s*(///?|/?\*+/?)\s?'), '');
    if (l.contains('{@tool')) skip = true;
    if (!skip && !RegExp(r'^\s*\{@(template|endtemplate|macro|youtube|animation|category|subCategory|end-inject-html|inject-html)').hasMatch(l)) {
      out.add(l);
    }
    if (l.contains('{@end-tool}')) skip = false;
  }
  var text = out.join('\n').trim();
  final i = text.indexOf(RegExp(r'\n\s*\n'));
  if (i > 0) text = text.substring(0, i);
  text = text.replaceAll(RegExp(r'\s*\n\s*'), ' ').trim();
  return text.isEmpty ? null : text;
}
