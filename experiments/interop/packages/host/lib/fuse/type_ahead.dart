// Hand-written escape hatch for flutter_typeahead (class D: builder with unencodable arguments).
// `TypeAheadField.builder` hands out a TextEditingController and a FocusNode that the package creates
// itself, and `suggestionsCallback` must *return* the list. This widget owns the text field and turns
// the pull API into push: JS gets `onSearch(text)` and answers by setting the `suggestions` prop.
// Nothing here mentions solid-fuse; the generator picks it up as `app.TypeAhead`.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_typeahead/flutter_typeahead.dart';

class TypeAhead extends StatefulWidget {
  const TypeAhead({
    super.key,
    required this.suggestions,
    this.query,
    this.onSearch,
    this.onSelected,
    this.labelText,
    this.hintText,
    this.autofocus = false,
    this.debounceDuration = const Duration(milliseconds: 300),
    this.emptyText = 'No items found',
  });

  /// Suggestions for [query]. Set it in response to [onSearch].
  final List<String> suggestions;

  /// The search text [suggestions] answers. When null, any update is taken as the answer.
  final String? query;
  final ValueChanged<String>? onSearch;

  /// Called with the index of the chosen suggestion in [suggestions].
  final ValueChanged<int>? onSelected;
  final String? labelText;
  final String? hintText;
  final bool autofocus;
  final Duration debounceDuration;
  final String emptyText;

  @override
  State<TypeAhead> createState() => _TypeAheadState();
}

class _TypeAheadState extends State<TypeAhead> {
  Completer<List<String>>? _pending;
  String _search = '';

  @override
  void didUpdateWidget(TypeAhead old) {
    super.didUpdateWidget(old);
    final p = _pending;
    if (p != null && !p.isCompleted && (widget.query == null || widget.query == _search)) {
      p.complete(widget.suggestions);
    }
  }

  Future<List<String>> _suggest(String search) {
    _search = search;
    if (widget.onSearch == null) return Future.value(widget.suggestions);
    _pending?.complete(const []);
    final c = _pending = Completer<List<String>>();
    widget.onSearch!(search);
    return c.future;
  }

  @override
  Widget build(BuildContext context) {
    return TypeAheadField<String>(
      debounceDuration: widget.debounceDuration,
      suggestionsCallback: _suggest,
      builder: (context, controller, focusNode) => TextField(
        controller: controller,
        focusNode: focusNode,
        autofocus: widget.autofocus,
        decoration: InputDecoration(
          border: const OutlineInputBorder(),
          labelText: widget.labelText,
          hintText: widget.hintText,
        ),
      ),
      itemBuilder: (context, value) => ListTile(title: Text(value)),
      emptyBuilder: (context) => Padding(padding: const EdgeInsets.all(12), child: Text(widget.emptyText)),
      onSelected: (value) => widget.onSelected?.call(widget.suggestions.indexOf(value)),
    );
  }
}
