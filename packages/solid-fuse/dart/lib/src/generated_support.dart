// Runtime support for the adapters `fuse gen` writes. Generated code calls
// only into this file, FuseNode, and the libraries it adapts.
import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';
import 'node.dart';
import 'node_widget.dart';
import 'runtime.dart';

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

/// A map whose keys JSON can't hold as object keys: `[key, value]` pairs.
Map<K, V>? decEntries<K, V>(Object? v, K Function(Object? k) kf, V Function(Object? e) vf) =>
    v is List ? {for (final e in v) kf((e as List)[0]): vf(e[1])} : null;

/// Typed data: bytes arrive as a Uint8List (an ArrayBuffer or a view of one
/// in JS), read as [T] over the same bytes.
T? decBytes<T extends TypedData>(Object? v) {
  var b = switch (v) {
    Uint8List() => v,
    ByteBuffer() => v.asUint8List(),
    TypedData() => v.buffer.asUint8List(v.offsetInBytes, v.lengthInBytes),
    List() => Uint8List.fromList(v.cast<int>()),
    _ => null,
  };
  if (b == null) return null;
  if (T == Uint8List) return b as T;
  // A view of wider elements starts at a multiple of their size.
  if (b.offsetInBytes % 8 != 0) b = Uint8List.fromList(b);
  final Object r = switch (T) {
    const (ByteData) => ByteData.sublistView(b),
    const (Uint8ClampedList) => Uint8ClampedList.sublistView(b),
    const (Int8List) => Int8List.sublistView(b),
    const (Uint16List) => Uint16List.sublistView(b),
    const (Int16List) => Int16List.sublistView(b),
    const (Uint32List) => Uint32List.sublistView(b),
    const (Int32List) => Int32List.sublistView(b),
    const (Uint64List) => Uint64List.sublistView(b),
    const (Int64List) => Int64List.sublistView(b),
    const (Float32List) => Float32List.sublistView(b),
    const (Float64List) => Float64List.sublistView(b),
    _ => throw ArgumentError('cannot read bytes as $T'),
  };
  return r as T;
}

/// A JSX `key` prop. Strings and numbers become value keys.
ValueKey<Object>? decKey(Object? v) => v == null ? null : ValueKey<Object>(v);

/// The `$` tag of a tagged value, or [fallback] (the declared type's unnamed
/// constructor) for a plain object.
String fuseTag(Map<Object?, Object?> m, String fallback) => m[r'$'] as String? ?? fallback;

/// [v] as a [T]: gives a closure its parameter types where nothing else
/// does (an argument passed through `Function.apply`).
T fuseTyped<T>(T v) => v;

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

/// The widget of the node a typed slot points at (Scaffold's `appBar`, a
/// `List<Tab>`): the node's own widget, built here in
/// [context], so the slot gets the type it asks for. The widget building it
/// rebuilds when the node changes ([FuseTypedSlots]).
S? decTyped<S extends Widget>(FuseNode n, Object? v, BuildContext context) {
  final node = fuseNodeOf(n, v);
  if (node == null) return null;
  FuseTypedSlots._collecting?.add(node);
  final w = FuseRuntimeScope.of(context).makeWidgetForNode(node, context);
  if (w is S) return w;
  throw ArgumentError('<${node.type}> is not a $S, which this slot takes');
}

/// Builds a widget with typed slots, and builds it again when a node one of
/// them took changes (that node's widget is part of this one).
class FuseTypedSlots extends StatefulWidget {
  const FuseTypedSlots({super.key, required this.builder});

  final WidgetBuilder builder;

  /// Nodes [decTyped] reads during the current build.
  static List<FuseNode>? _collecting;

  @override
  State<FuseTypedSlots> createState() => _FuseTypedSlotsState();
}

class _FuseTypedSlotsState extends State<FuseTypedSlots> {
  Set<FuseNode> _watched = {};

  void _changed() => setState(() {});

  void _unwatch(FuseNode node) {
    // A disposed node is out of the registry and has no listeners left.
    if (identical(node.registry.tryGet(node.id), node)) node.removeListener(_changed);
  }

  @override
  Widget build(BuildContext context) {
    final outer = FuseTypedSlots._collecting;
    final seen = FuseTypedSlots._collecting = [];
    try {
      return widget.builder(context);
    } finally {
      FuseTypedSlots._collecting = outer;
      final now = seen.toSet();
      for (final node in _watched) {
        if (!now.contains(node)) _unwatch(node);
      }
      for (final node in now) {
        if (!_watched.contains(node)) node.addListener(_changed);
      }
      _watched = now;
    }
  }

  @override
  void dispose() {
    _watched.forEach(_unwatch);
    super.dispose();
  }
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

/// A JS function Dart calls synchronously for a value (a callback that
/// returns one at once). Its result is undecoded.
Object? Function([Object? value])? decFnSync(FuseNode n, Object? v, String prop) {
  final name = _fnName(v, prop);
  if (name == null) return null;
  final call = n.registry.callFunctionSync;
  if (call == null) return ([value]) => throw FuseCallbackError(name, 'no JS connection');
  return ([value]) => call(n.id, name, value).$1;
}

/// A JS function that builds a widget (a builder such as `itemBuilder`): each
/// call runs it at once and shows the node it returns, or gives null when it
/// returns nothing. A throw shows as an error widget.
Widget? Function([Object? value])? decFnBuild(FuseNode n, Object? v, String prop) {
  final name = _fnName(v, prop);
  if (name == null) return null;
  final call = n.registry.callFunctionSync;
  return ([value]) {
    try {
      if (call == null) throw FuseCallbackError(name, 'no JS connection');
      final (node, root) = call(n.id, name, value, widget: true);
      if (node is! FuseNode) {
        if (root != null) n.registry.unbuild?.call(root);
        return null;
      }
      return FuseBuiltWidget._(node: node, root: root, unbuild: n.registry.unbuild);
    } catch (e, st) {
      FlutterError.reportError(FlutterErrorDetails(exception: e, stack: st, library: 'solid_fuse'));
      return ErrorWidget(e);
    }
  };
}

/// A builder's widget where Dart needs one: nothing is an empty box.
Widget fuseWidget(Widget? w) => w ?? const SizedBox.shrink();

/// What a JS builder returned. The JS root it was built in lives until the
/// widget is gone: replaced by another, unmounted, or never mounted and
/// collected.
class FuseBuiltWidget extends StatefulWidget {
  FuseBuiltWidget._({required this.node, required this.root, required this.unbuild}) {
    if (root != null && unbuild != null) _collected.attach(this, (root!, unbuild!), detach: this);
  }

  final FuseNode node;
  final int? root;
  final void Function(int root)? unbuild;

  static final _collected = Finalizer<(int, void Function(int))>((r) => r.$2(r.$1));

  void _release() {
    _collected.detach(this);
    if (root != null) unbuild?.call(root!);
  }

  @override
  State<FuseBuiltWidget> createState() => _FuseBuiltState();
}

class _FuseBuiltState extends State<FuseBuiltWidget> {
  @override
  void didUpdateWidget(FuseBuiltWidget old) {
    super.didUpdateWidget(old);
    if (old.root != widget.root) old._release();
  }

  @override
  void dispose() {
    widget._release();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FuseNodeWidget(node: widget.node);
}

/// A member of an abstract class JS implements: the function JS gave, or an
/// error naming the one it left out.
T fuseImpl<T extends Function>(T? f, String name) =>
    f ?? (throw FuseCallbackError(name, 'the JS object has no "$name"'));

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

/// Typed data as its bytes (an ArrayBuffer in JS).
Uint8List? encBytes(TypedData? v) => v?.buffer.asUint8List(v.offsetInBytes, v.lengthInBytes);

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
  FuseGeneratedHandle(super.node) : _isBorrowed = false;

  /// A handle for an object Dart hands to JS ([FuseNodeRegistry.lend]): it
  /// mirrors and forwards like one JS created, but the object stays Dart's
  /// (never released).
  FuseGeneratedHandle.borrowed(super.node) : _isBorrowed = true;

  final bool _isBorrowed;

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

  Map<String, Object?>? _seed;

  /// Starts mirroring; the generated constructor calls it last. A borrowed
  /// handle's first state goes with the reference that hands it to JS
  /// ([takeSeed]): JS has no node to push to yet.
  void start() {
    if (!_isBorrowed) node.registry.own(object, node);
    if (object case final Listenable l) {
      _listening = l..addListener(_changed);
    }
    if (_isBorrowed) {
      _seed = _sent = _read();
    } else {
      _push();
    }
  }

  /// The state a borrowed handle starts with, once.
  Map<String, Object?>? takeSeed() {
    final s = _seed;
    _seed = null;
    return s == null || s.isEmpty ? null : s;
  }

  Map<String, Object?> _read() {
    final now = <String, Object?>{};
    snapshot((name, read) {
      try {
        now[name] = read();
      } catch (_) {
        // Not readable right now (a ScrollController without a client).
      }
    });
    return now;
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
    final now = _read();
    final diff = <String, Object?>{};
    for (final MapEntry(:key, :value) in now.entries) {
      if (!_sent.containsKey(key) || !_same(_sent[key], value)) {
        diff[key] = value;
      } else {
        // Not sent: the borrowed references reading it counted go back.
        _giveBack(value);
      }
    }
    _sent = now;
    if (diff.isEmpty) return;
    node.callFunction(node.id, r'$push', {'v': _version, 's': diff});
  }

  void _giveBack(Object? v) {
    if (v is Map) {
      if (v[r'$h'] case final int id) {
        if (v['o'] == null) node.registry.unborrow(id, 1);
        return;
      }
      v.values.forEach(_giveBack);
    } else if (v is List) {
      v.forEach(_giveBack);
    }
  }

  static bool _same(Object? a, Object? b) {
    if (a is Map && b is Map) {
      // A handle reference: the same handle, whether or not it carried state.
      if (a[r'$h'] case final int id) return b[r'$h'] == id;
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
      case r'$sync':
        // JS made a new handle for an object it had no state of: all of it.
        _sent = const {};
        _push();
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
    if (_isBorrowed) return;
    SchedulerBinding.instance.addPostFrameCallback((_) => release());
    SchedulerBinding.instance.ensureVisualUpdate();
  }
}
