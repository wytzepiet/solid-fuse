// What gets exported, per library. Apps don't write this: it is read from
// their barrels (`lib/fuse.dart`, see barrels.dart). Tests and tools can also
// pass it as JSON:
//
//   {
//     "libraries": {
//       "package:flutter/widgets.dart": { "allow": ["Text", "Image.*"], "deny": ["Image.memory"] },
//       "package:fl_chart/fl_chart.dart": {}
//     }
//   }
//
// A missing allow list means everything the library declares; an empty one
// means none of its classes; deny wins over allow. Patterns match `Class` or
// `Class.constructor`; `*` matches any run of characters. A class pattern
// covers all its constructors.

class LibraryRule {
  LibraryRule({this.allow, this.deny = const [], this.shorthands = const {}});

  /// Null: every class the library declares.
  final List<String>? allow;
  final List<String> deny;

  /// `@fuseShorthand` functions of the library to read.
  final Set<String> shorthands;

  bool get allowsAll => allow == null;

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
    final a = allow;
    return a == null || _any(a, cls, ctor);
  }

  /// Named explicitly in the allow list (not only through "everything").
  bool explicitlyAllows(String cls) {
    final a = allow;
    return a != null && _any(a, cls, null);
  }

  /// What either rule exports.
  LibraryRule union(LibraryRule o) => LibraryRule(
        allow: allow == null || o.allow == null ? null : {...allow!, ...o.allow!}.toList(),
        deny: [for (final d in deny) if (o.deny.contains(d)) d],
        shorthands: {...shorthands, ...o.shorthands},
      );
}

class GenConfig {
  GenConfig(this.libraries);
  final Map<String, LibraryRule> libraries;

  /// This config plus [more]; a library in both exports what either does.
  GenConfig merged(Map<String, LibraryRule> more) {
    final out = {...libraries};
    more.forEach((uri, rule) => out[uri] = out[uri]?.union(rule) ?? rule);
    return GenConfig(out);
  }

  static List<String>? _strings(Object? v, String where) {
    if (v == null) return null;
    if (v is! List || v.any((e) => e is! String)) {
      throw FormatException('$where must be a list of strings');
    }
    return v.cast<String>();
  }

  factory GenConfig.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('config must be an object');
    final libs = json['libraries'] ?? const {};
    if (libs is! Map) throw const FormatException('config.libraries must be an object');
    return GenConfig({
      for (final MapEntry(:key, :value) in libs.entries)
        key as String: value is Map
            ? LibraryRule(
                allow: _strings(value['allow'], '$key.allow'),
                deny: _strings(value['deny'], '$key.deny') ?? const [],
              )
            : LibraryRule(),
    });
  }
}
