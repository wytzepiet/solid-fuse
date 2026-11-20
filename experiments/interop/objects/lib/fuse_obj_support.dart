// Hand-written runtime support for GENERATED object handles and plugin
// modules. Everything the object/module generators emit calls into this file,
// fuse_gen_support.dart (codecs) and solid_fuse's public API. Nothing here
// knows about a specific controller or plugin.
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter/services.dart' show PlatformException, MissingPluginException;
import 'package:solid_fuse/solid_fuse.dart';

// ── typed errors ────────────────────────────────────────────────────────────
//
// The bridge turns a thrown Dart error into `JsError.runtime('$e\n$st')`, a
// string. Generated code never throws across the bridge: it *returns* an
// envelope, and the generated TS unwraps it into a `FuseError` with fields.

const kErr = r'$err';

/// A structured error an API author (or the generator) can throw on purpose.
class FuseCallError implements Exception {
  const FuseCallError(this.type, this.message, {this.code, this.details});
  final String type;
  final String message;
  final String? code;
  final Object? details;
  @override
  String toString() => '$type: $message';
}

Map<String, Object?> fuseEncodeError(Object e, StackTrace st) {
  final m = <String, Object?>{};
  if (e is FuseCallError) {
    m['type'] = e.type;
    m['message'] = e.message;
    if (e.code != null) m['code'] = e.code;
    if (e.details != null) m['details'] = e.details;
  } else if (e is PlatformException) {
    m['type'] = 'PlatformException';
    m['code'] = e.code;
    m['message'] = e.message ?? e.code;
    if (e.details != null) m['details'] = '${e.details}';
  } else if (e is MissingPluginException) {
    m['type'] = 'MissingPluginException';
    m['message'] = e.message ?? 'missing plugin';
  } else if (e is ArgumentError) {
    m['type'] = e is RangeError ? 'RangeError' : 'ArgumentError';
    m['message'] = '$e';
    if (e.name != null) m['code'] = e.name;
  } else if (e is TickerCanceled) {
    m['type'] = 'TickerCanceled';
    m['message'] = 'The animation was canceled before it completed';
  } else {
    // AssertionError, StateError, FlutterError, package exceptions: the type
    // name is the only stable discriminator Dart gives us.
    m['type'] = e.runtimeType.toString().replaceFirst(RegExp(r'^_'), '');
    m['message'] = '$e';
  }
  if (kDebugMode) m['stack'] = '$st';
  return m;
}

/// Runs [body]; any throw becomes an `{$err: {...}}` envelope.
Future<Object?> fuseGuard(FutureOr<Object?> Function() body) async {
  try {
    return await body();
  } catch (e, st) {
    return {kErr: fuseEncodeError(e, st)};
  }
}

Never fuseUnknown(String owner, String member) =>
    throw FuseCallError('UnknownMember', '$owner has no bridged member "$member"', code: member);

/// RPC arguments always cross as one map keyed by parameter name.
Map<dynamic, dynamic> fuseArgs(Object? v) => v is Map ? v : const {};

/// `TickerFuture` never completes when the ticker is canceled, which would
/// leave the JS promise pending forever; `orCancel` rejects instead.
Future<T> fuseAwait<T>(Future<T> f) => f is TickerFuture ? (f as TickerFuture).orCancel as Future<T> : f;

// ── object references ───────────────────────────────────────────────────────

/// Resolve an object argument (`{_node: id}` on the wire) to the Dart object a
/// handle owns.
T? fuseObjArg<T>(FuseNode node, Object? v) {
  if (v == null) return null;
  FuseNode? target;
  if (v is FuseNode) {
    target = v;
  } else if (v is Map && v['_node'] is num) {
    target = node.registry.tryGet((v['_node'] as num).toInt());
  }
  final o = target?.ownHandle?.object;
  if (o is T) return o;
  throw FuseCallError('BadObjectRef', 'expected a handle wrapping $T, got ${o.runtimeType}');
}

// ── environmental dependencies ──────────────────────────────────────────────

/// `vsync:` for objects that live in a handle (outside the widget tree). The
/// handle is the TickerProvider; tickers are tracked and disposed with it.
/// Unlike a `State` ticker provider this does not follow `TickerMode`, so
/// animations are not muted when the route is offstage.
mixin FuseTickerProvider<T> on FuseHandle<T> implements TickerProvider {
  final _tickers = <Ticker>{};

  @override
  Ticker createTicker(TickerCallback onTick) {
    final t = Ticker(onTick, debugLabel: kDebugMode ? 'fuse handle #${node.id}' : null);
    _tickers.add(t);
    return t;
  }

  /// Flutter controllers dispose their own ticker; this only clears the set
  /// and catches tickers a controller leaked.
  void disposeTickers() => _tickers.clear();

  /// Lets a widget feed its `TickerMode` to tickers that live outside the
  /// tree (see [FuseTickerModeScope]).
  set tickersMuted(bool muted) {
    for (final t in _tickers) {
      t.muted = muted;
    }
  }
}

/// Optional widget-side half of an environmental dependency: wrap the part of
/// the tree an animation belongs to, and the handle's tickers follow that
/// subtree's [TickerMode] (muted when the route is offstage), as a
/// `State with TickerProviderStateMixin` would.
class FuseTickerModeScope extends StatelessWidget {
  const FuseTickerModeScope({super.key, required this.handle, required this.child});
  final FuseHandle? handle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final h = handle;
    // ignore: deprecated_member_use
    if (h is FuseTickerProvider) h.tickersMuted = !TickerMode.of(context);
    return child;
  }
}

// ── Dart-created objects handed to JS ───────────────────────────────────────

/// Node ids are allocated by JS (0, 1, 2, ...). Objects created on the Dart
/// side (returned from a method or getter, or passed in a callback) get
/// negative ids, so both sides can allocate without coordinating.
int _nextAdoptedId = -1;
final Expando<FuseNode> _adopted = Expando('fuseAdopted');

typedef FuseWrapFactory = FuseHandle Function(FuseNode node, Object object);
final Map<String, FuseWrapFactory> fuseWrapFactories = {};

/// Hand a Dart-created object to JS as a new handle node. Identity is
/// preserved: the same Dart object always maps to the same node, so JS can
/// compare references and a second request does not create a second handle.
///
/// [owned] objects are disposed (`object.dispose()`) when their node is
/// removed; borrowed ones are only unregistered. The wire form carries the
/// current mirrored state so the JS signals start correct.
Map<String, Object?>? fuseAdopt(
  FuseNodeRegistry registry,
  Object? object,
  String type, {
  bool owned = false,
  List<FuseNode>? track,
}) {
  if (object == null) return null;
  var n = _adopted[object];
  if (n == null || registry.tryGet(n.id) != n) {
    final factory = fuseWrapFactories[type];
    if (factory == null) {
      throw FuseCallError('NotRegistered', 'no generated handle registered for "$type"');
    }
    n = registry.create(_nextAdoptedId--, type, {r'$borrowed': !owned});
    n.ownHandle = factory(n, object);
    _adopted[object] = n;
    track?.add(n);
  }
  final h = n.ownHandle;
  return {'_node': n.id, 'type': type, 'state': h is FuseObjectHandle ? h.snapshot() : const <String, Object?>{}};
}

/// Base class for generated object handles.
abstract class FuseObjectHandle<T extends Object> extends FuseHandle<T> {
  FuseObjectHandle(super.node, {this.borrowed = false});

  /// The object belongs to someone else (a parent handle, the framework, a
  /// plugin singleton): removing the node must not dispose it.
  final bool borrowed;

  final _children = <FuseNode>[];
  final _subs = <String, StreamSubscription<dynamic>>{};
  bool _disposed = false;
  bool get isDisposed => _disposed;

  /// Push changed mirrored state to JS: one message per notification, only
  /// the fields that changed.
  void pushState(Map<String, Object?> patch) {
    if (patch.isEmpty || _disposed) return;
    node.callback(r'$state')?.call(patch);
  }

  /// All mirrored values, as they are now.
  Map<String, Object?> snapshot() => const {};

  /// Re-read the mirrored getters and push what changed.
  void refresh() {}

  /// For state that changes with no Listenable notification (a scroll
  /// position attaching, dimensions arriving at layout): refresh now and once
  /// more after the current frame.
  void refreshSoon() {
    if (_disposed) return;
    scheduleMicrotask(() {
      if (!_disposed) refresh();
    });
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!_disposed) refresh();
    });
  }

  /// The first snapshot cannot be sent from the constructor: function props
  /// (`$state`) arrive as `setProp` ops right after `create`, in the same
  /// batch. A microtask runs after that batch.
  void scheduleInitialPush(void Function() push) => scheduleMicrotask(() {
        if (!_disposed) push();
      });

  void emit(String stream, Object? value) => node.callback(r'$event')?.call({'s': stream, 'v': value});

  /// Subscribe JS to a Dart stream (lazily, on the first JS listener).
  void listen<E>(String name, Stream<E> Function() stream, Object? Function(E e) encode) {
    _subs[name] ??= stream().listen(
      (e) => emit(name, encode(e)),
      onError: (Object e, StackTrace st) =>
          node.callback(r'$event')?.call({'s': name, 'e': fuseEncodeError(e, st)}),
    );
  }

  void cancel(String name) => _subs.remove(name)?.cancel();

  /// Adopt an object this handle hands out. The child is tied to this handle:
  /// it is removed when this handle is disposed, which is the backstop for
  /// objects JS forgot.
  Map<String, Object?>? adopt(Object? object, String type, {bool owned = false}) =>
      fuseAdopt(node.registry, object, type, owned: owned, track: _children);

  /// Subclass hook: release the wrapped object.
  void disposeObject();

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    for (final s in _subs.values) {
      s.cancel();
    }
    _subs.clear();
    for (final c in _children) {
      if (node.registry.tryGet(c.id) == c) node.registry.remove(c.id);
    }
    _children.clear();
    if (!borrowed) disposeObject();
  }
}

// ── plugin modules (no node, no widget) ─────────────────────────────────────

/// What a generated module needs from the runtime: register a JS -> Dart
/// channel handler, send Dart -> JS events, and the node registry (to hand
/// out objects). `FuseBridge.runtime(channels, registry)` adapts the real
/// thing; tests use a fake.
class FuseBridge {
  FuseBridge({required this.on, required this.send, required this.registry});
  factory FuseBridge.runtime(FuseChannels c, FuseNodeRegistry registry) =>
      FuseBridge(on: c.on, send: c.send, registry: registry);

  final void Function(String channel, FutureOr<dynamic> Function(Map<String, dynamic> data) handler) on;
  final FutureOr<void> Function(String channel, Map<String, dynamic> data) send;
  final FuseNodeRegistry registry;
}

/// Stream subscriptions of one module, keyed by a JS-allocated id.
class FuseSubscriptions {
  FuseSubscriptions(this.bridge, this.eventChannel);
  final FuseBridge bridge;
  final String eventChannel;
  final _subs = <int, StreamSubscription<dynamic>>{};

  int get length => _subs.length;

  void listen<E>(int id, Stream<E> stream, Object? Function(E e) encode) {
    _subs[id]?.cancel();
    _subs[id] = stream.listen(
      (e) => bridge.send(eventChannel, {'id': id, 'v': encode(e)}),
      onError: (Object e, StackTrace st) => bridge.send(eventChannel, {'id': id, 'e': fuseEncodeError(e, st)}),
      onDone: () {
        _subs.remove(id);
        bridge.send(eventChannel, {'id': id, 'done': true});
      },
    );
  }

  void cancel(int id) => _subs.remove(id)?.cancel();
}
