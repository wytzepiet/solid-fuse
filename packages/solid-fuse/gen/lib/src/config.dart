// What gets exported. The fuse CLI turns `fuse.config.ts` into this JSON.
//
//   {
//     "libraries": {
//       "package:flutter/widgets.dart": { "allow": ["Text", "Image.*"], "deny": ["Image.memory"] },
//       "package:fl_chart/fl_chart.dart": {}
//     }
//   }
//
// Rules (NativeScript's): an empty or missing allow list means everything the
// library declares; deny wins over allow. Patterns match `Class` or
// `Class.constructor`; `*` matches any run of characters. A class pattern
// covers all its constructors.

class LibraryRule {
  LibraryRule({this.allow = const [], this.deny = const [], this.annotated = false});
  final List<String> allow;
  final List<String> deny;

  /// Only what is annotated: `@fuse` classes and `@fuseShorthand`
  /// functions (the app's own Dart, solid_fuse's shorthands).
  final bool annotated;

  bool get allowsAll => allow.isEmpty;

  static bool _match(String pattern, String name) {
    if (!pattern.contains('*')) return pattern == name;
    final re = RegExp('^${pattern.split('*').map(RegExp.escape).join('.*')}\$');
    return re.hasMatch(name);
  }

  bool _any(List<String> patterns, String cls, String? ctor) {
    final full = ctor == null ? cls : '$cls.$ctor';
    return patterns.any((p) => _match(p, cls) || _match(p, full));
  }

  /// [ctor] is null for the unnamed constructor.
  bool includes(String cls, [String? ctor]) {
    if (_any(deny, cls, ctor)) return false;
    return allow.isEmpty || _any(allow, cls, ctor);
  }

  /// Named explicitly in the allow list (not only through "everything").
  bool explicitlyAllows(String cls) => allow.isNotEmpty && _any(allow, cls, null);
}

class GenConfig {
  GenConfig(this.libraries);
  final Map<String, LibraryRule> libraries;

  /// This config plus [uris] read for annotations only (a library the config
  /// lists keeps its own rule).
  GenConfig withAnnotated(Iterable<String> uris) => GenConfig({
        ...libraries,
        for (final u in uris)
          if (!libraries.containsKey(u)) u: LibraryRule(annotated: true),
      });

  static List<String> _strings(Object? v, String where) {
    if (v == null) return const [];
    if (v is! List || v.any((e) => e is! String)) {
      throw FormatException('$where must be a list of strings');
    }
    return v.cast<String>();
  }

  factory GenConfig.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('config must be an object');
    final libs = json['libraries'];
    if (libs is! Map) throw const FormatException('config.libraries must be an object');
    return GenConfig({
      for (final MapEntry(:key, :value) in libs.entries)
        key as String: value is Map
            ? LibraryRule(
                allow: _strings(value['allow'], '$key.allow'),
                deny: _strings(value['deny'], '$key.deny'),
              )
            : LibraryRule(),
    });
  }
}
