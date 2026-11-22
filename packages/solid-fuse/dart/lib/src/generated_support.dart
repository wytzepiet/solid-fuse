// Runtime support for the adapters `fuse gen` writes. Generated code calls
// only into this file, FuseNode, and the libraries it adapts.
import 'package:flutter/widgets.dart';

import 'node.dart';

// ── JS -> Dart ──────────────────────────────────────────────────────────────

bool? decBool(Object? v) => v is bool ? v : null;

int? decInt(Object? v) => v is num ? v.toInt() : null;

/// renderer.ts sends non-finite numbers as the strings "Infinity",
/// "-Infinity" and "NaN".
double? decDouble(Object? v) => switch (v) {
  num() => v.toDouble(),
  'Infinity' => double.infinity,
  '-Infinity' => double.negativeInfinity,
  'NaN' => double.nan,
  _ => null,
};

num? decNum(Object? v) => v is num ? v : decDouble(v);

String? decString(Object? v) => v is String ? v : null;

T? decEnum<T extends Enum>(List<T> values, Object? v) {
  if (v == null) return null;
  for (final e in values) {
    if (e.name == v) return e;
  }
  return fuseBad(T.toString(), v);
}

List<T>? decList<T>(Object? v, T Function(Object? e) f) => v is List ? [for (final e in v) f(e)] : null;

Map<K, V>? decMap<K, V>(Object? v, K Function(String k) kf, V Function(Object? e) vf) =>
    v is Map ? {for (final MapEntry(:key, :value) in v.entries) kf(key as String): vf(value)} : null;

/// A JSX `key` prop. Strings and numbers become value keys.
Key? decKey(Object? v) => v == null ? null : ValueKey<Object>(v);

/// The `$` tag of a tagged value, or [fallback] (the declared type's unnamed
/// constructor) for a plain object.
String fuseTag(Map<Object?, Object?> m, String fallback) => m[r'$'] as String? ?? fallback;

/// A required prop or argument was not given.
T fuseReq<T>(T? v, String owner, String name) {
  if (v == null) throw ArgumentError('$owner: "$name" is required');
  return v;
}

Never fuseBad(String type, Object? v) => throw ArgumentError('cannot read a $type from ${v.runtimeType}: $v');

// ── Dart -> JS ──────────────────────────────────────────────────────────────

/// JSON cannot carry NaN or the infinities; they cross as strings.
Object? encDouble(double? v) => v == null || v.isFinite ? v : v.toString();

/// Arguments of a callback with more than one parameter; the renderer spreads
/// them into the JS handler.
class FuseCallArgs {
  const FuseCallArgs(this.args);
  final List<Object?> args;
}

// ── children ────────────────────────────────────────────────────────────────

extension FuseGeneratedNode on FuseNode {
  /// JSX children for a single `child` slot: none is null, one is itself, and
  /// several stack vertically (the same rule as the built-in widgets).
  Widget? get childSlot => children.isEmpty ? null : flexChildren;

  /// JSX children for a `children` slot.
  List<Widget> get childrenSlot => childWidgets;

  /// The text of the JSX children, for a widget whose first positional
  /// parameter is its text (`<Text>Hello</Text>`).
  String get textContent {
    final b = StringBuffer();
    void walk(FuseNode n) {
      for (final c in n.children) {
        if (c.type == '__text__') {
          b.write(c.props['text'] ?? '');
        } else {
          walk(c);
        }
      }
    }

    walk(this);
    return b.toString();
  }

  /// A prop holding a JSX element, as a widget.
  Widget? widgetProp(String name) => widget(name);

  /// A callback with more than one parameter.
  void Function(List<Object?> args)? callbackArgs(String name) {
    final f = callback(name);
    if (f == null) return null;
    return (args) => f(FuseCallArgs(args));
  }
}
