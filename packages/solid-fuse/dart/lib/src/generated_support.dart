// Runtime support for the adapters `fuse gen` writes. Generated code calls
// only into this file, FuseNode, and the libraries it adapts.
import 'package:flutter/widgets.dart';

import 'node.dart';
import 'node_widget.dart';

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
ValueKey<Object>? decKey(Object? v) => v == null ? null : ValueKey<Object>(v);

/// The `$` tag of a tagged value, or [fallback] (the declared type's unnamed
/// constructor) for a plain object.
String fuseTag(Map<Object?, Object?> m, String fallback) => m[r'$'] as String? ?? fallback;

/// A required prop or argument was not given.
T fuseReq<T>(T? v, String owner, String name) {
  if (v == null) throw ArgumentError('$owner: "$name" is required');
  return v;
}

Never fuseBad(String type, Object? v) => throw ArgumentError('cannot read a $type from ${v.runtimeType}: $v');

// ── nodes, functions and handles (top-level props or inside values) ─────────

/// The node a value points at: a node prop arrives as the node itself, a node
/// inside a value as `{_node: id}`.
FuseNode? fuseNodeOf(FuseNode n, Object? v) {
  if (v is FuseNode) return v;
  if (v is Map && v['_node'] is int) return n.registry.tryGet(v['_node'] as int);
  return null;
}

Widget? decWidget(FuseNode n, Object? v) {
  final node = fuseNodeOf(n, v);
  return node == null ? null : FuseNodeWidget(node: node);
}

/// The object of the handle a value points at, when it is a [T].
T? decHandle<T>(FuseNode n, Object? v) {
  final object = fuseNodeOf(n, v)?.ownHandle?.object;
  return object is T ? object : null;
}

/// The handler name of a function: a function prop arrives as `true` (named
/// by the prop), a function inside a value as `{$fn: "<prop>#<i>"}`.
String? _fnName(Object? v, String prop) => v == true ? prop : (v is Map ? v[r'$fn'] as String? : null);

/// A JS function, called without waiting. [FuseCallArgs] spreads.
void Function([Object? value])? decFn(FuseNode n, Object? v, String prop) {
  final name = _fnName(v, prop);
  if (name == null) return null;
  return ([value]) => n.callFunction(n.id, name, value);
}

/// A JS function whose result Dart waits for (a Promise is awaited).
Future<Object?> Function([Object? value])? decFnAsync(FuseNode n, Object? v, String prop) {
  final name = _fnName(v, prop);
  if (name == null) return null;
  final call = n.registry.callFunctionAsync;
  if (call == null) return ([value]) async => throw FuseCallbackError(name, 'no JS connection');
  return ([value]) => call(n.id, name, value);
}

/// A JS callback threw or its Promise rejected.
class FuseCallbackError implements Exception {
  FuseCallbackError(this.name, this.message);
  final String name;
  final String message;
  @override
  String toString() => 'JS callback "$name" failed: $message';
}

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
}
