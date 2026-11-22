// Runtime support for the adapters `fuse gen` writes. Generated code calls
// only into this file, FuseNode, and the libraries it adapts.
import 'dart:async';

import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';
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

/// A widget for a `PreferredSizeWidget` slot (Scaffold's `appBar`). The node's
/// adapter knows the size (generated adapters of PreferredSizeWidgets are
/// ones too); the child still rebuilds on its own.
PreferredSizeWidget? decPreferredSize(FuseNode n, Object? v, Map<String, Widget Function(FuseNode)> builders) {
  final node = fuseNodeOf(n, v);
  if (node == null) return null;
  final w = builders[node.type]?.call(node);
  if (w is! PreferredSizeWidget) {
    throw ArgumentError('<${node.type}> has no preferred size; this slot takes a widget that does (an app bar)');
  }
  return PreferredSize(preferredSize: w.preferredSize, child: FuseNodeWidget(node: node));
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

/// A value of no declared shape: what JSON can carry goes as it is, anything
/// else as its `toString()`.
Object? encAny(Object? v) => switch (v) {
  null || bool() || String() => v,
  double() => encDouble(v),
  num() => v,
  Enum() => v.name,
  List() => [for (final e in v) encAny(e)],
  Map() => {for (final MapEntry(:key, :value) in v.entries) '$key': encAny(value)},
  _ => '$v',
};

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

// ── handles ─────────────────────────────────────────────────────────────────

/// The TickerProvider generated code passes where Dart asks for a `vsync`.
/// Its tickers are not muted by TickerMode (a hidden route keeps ticking).
const TickerProvider fuseVsync = _FuseVsync();

class _FuseVsync implements TickerProvider {
  const _FuseVsync();
  @override
  Ticker createTicker(TickerCallback onTick) => Ticker(onTick, debugLabel: 'fuse');
}

/// Positional argument [i] of a method call from JS.
Object? fuseAt(List<Object?> a, int i) => i < a.length ? a[i] : null;

/// The named arguments of a method call from JS: an object after the [n]
/// positional ones.
Map<Object?, Object?> fuseNamed(List<Object?> a, int n) => n < a.length && a[n] is Map ? a[n] as Map : const {};

/// Records one mirrored value; [read] may throw (a getter that needs a
/// client), and then the value is left out.
typedef FuseSnapshot = void Function(String name, Object? Function() read);

/// Base of the handles `fuse gen` writes. JS creates one with `createX`:
///
/// - the getters in [snapshot] are mirrored: pushed to JS (`$push`) when the
///   object notifies, only what changed, coalesced to one push per microtask;
/// - `$set` writes a setter. Each write carries a version; a push carries the
///   newest version Dart has applied, so JS drops pushes that left before
///   its write landed (a cursor that would jump back);
/// - `$listen` / `$cancel` run a Stream getter into a JS async iterable;
/// - anything else is a method call ([invoke]).
///
/// Dart never disposes one on its own: JS says when (its owner is gone and
/// nothing reaches it), and then [release] runs after the frame, when no
/// widget uses the object any more.
abstract class FuseGeneratedHandle<T extends Object> extends FuseHandle<T> {
  FuseGeneratedHandle(super.node);

  /// The mirrored getters, read by name.
  void snapshot(FuseSnapshot put) {}

  /// Writes setter [name].
  void set(String name, Object? value) => throw StateError('${node.type} has no setter "$name"');

  /// Calls method [name] with the arguments JS passed.
  Future<Object?> invoke(String name, List<Object?> args) async => throw StateError('${node.type} has no method "$name"');

  /// Stream getter [name], its events encoded.
  Stream<Object?>? stream(String name) => null;

  /// Frees the object (its `dispose()`).
  void release() {}

  int _version = 0;
  Map<String, Object?> _sent = const {};
  bool _scheduled = false;
  bool _disposed = false;
  Listenable? _listening;
  final Map<String, StreamSubscription<Object?>> _subs = {};

  /// Starts mirroring; the generated constructor calls it last.
  void start() {
    if (object case final Listenable l) {
      _listening = l..addListener(_changed);
    }
    _push();
  }

  void _changed() {
    if (_scheduled || _disposed) return;
    _scheduled = true;
    scheduleMicrotask(() {
      _scheduled = false;
      if (!_disposed) _push();
    });
  }

  void _push() {
    final now = <String, Object?>{};
    snapshot((name, read) {
      try {
        now[name] = read();
      } catch (_) {
        // Not readable right now (a ScrollController without a client).
      }
    });
    final diff = <String, Object?>{
      for (final MapEntry(:key, :value) in now.entries)
        if (!_sent.containsKey(key) || !_same(_sent[key], value)) key: value,
    };
    _sent = now;
    if (diff.isEmpty) return;
    node.callFunction(node.id, r'$push', {'v': _version, 's': diff});
  }

  static bool _same(Object? a, Object? b) {
    if (a is Map && b is Map) {
      if (a.length != b.length) return false;
      for (final MapEntry(:key, :value) in a.entries) {
        if (!b.containsKey(key) || !_same(value, b[key])) return false;
      }
      return true;
    }
    if (a is List && b is List) {
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!_same(a[i], b[i])) return false;
      }
      return true;
    }
    return a == b;
  }

  @override
  Future<dynamic> call(String method, dynamic value) async {
    switch (method) {
      case r'$set':
        final m = value as Map;
        final v = (m['ver'] as num).toInt();
        if (v > _version) _version = v;
        set(m['n'] as String, m['v']);
        // Confirm at the new version, even when nothing changed.
        _sent = const {};
        _changed();
        return null;
      case r'$listen':
        final m = value as Map;
        final fn = m['fn'] as String;
        final s = stream(m['stream'] as String);
        if (s == null) throw StateError('${node.type} has no stream "${m['stream']}"');
        _subs[fn] = s.listen(
          (e) => node.callFunction(node.id, fn, {'v': e}),
          onError: (Object e) => node.callFunction(node.id, fn, {'e': '$e'}),
          onDone: () {
            _subs.remove(fn);
            node.callFunction(node.id, fn, {'d': true});
          },
        );
        return null;
      case r'$cancel':
        await _subs.remove((value as Map)['fn'])?.cancel();
        return null;
      default:
        return invoke(method, value is List ? value.cast<Object?>() : const []);
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _listening?.removeListener(_changed);
    for (final s in _subs.values) {
      s.cancel();
    }
    _subs.clear();
    // A widget that used the object may still be in the tree until the next
    // frame builds without it.
    SchedulerBinding.instance.addPostFrameCallback((_) => release());
    SchedulerBinding.instance.ensureVisualUpdate();
  }
}
