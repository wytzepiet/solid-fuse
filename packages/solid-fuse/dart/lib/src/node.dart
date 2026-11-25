import 'dart:async';
import 'dart:core' as core;
import 'dart:core';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';
import 'generated_support.dart' show FuseCallbackError, FuseGeneratedHandle;
import 'node_widget.dart';
import 'utils.dart';

/// Typed wrapper around a `Map<String, dynamic>`.
/// Used by [FuseNode] for props and returned by [map] for nested objects.
class FuseMap {
  const FuseMap(this._data);

  static FuseMap? from(dynamic value) {
    if (value is FuseMap) return value;
    if (value is Map) return FuseMap(Map<String, dynamic>.from(value));
    return null;
  }

  final Map<String, dynamic> _data;

  /// Raw access to the underlying map.
  dynamic operator [](String key) => _data[key];

  // ── Primitives ────────────────────────────────────────────────────────────

  /// A number prop. JSON cannot carry non-finite numbers, so renderer.ts
  /// sends them as the strings "Infinity", "-Infinity" and "NaN"
  /// (`width={Infinity}` is how a view asks to fill its parent).
  core.double? double(String key) {
    final v = _data[key];
    if (v is num) return v.toDouble();
    if (v is String) {
      switch (v) {
        case 'Infinity':
          return core.double.infinity;
        case '-Infinity':
          return core.double.negativeInfinity;
        case 'NaN':
          return core.double.nan;
      }
    }
    return null;
  }

  core.int? int(String key) =>
      _data[key] is num ? (_data[key] as num).toInt() : null;
  core.bool? bool(String key) => _data[key] as core.bool?;
  String? string(String key) => _data[key] as String?;
  List<T>? list<T>(String key) => (_data[key] as List?)?.cast<T>();
  FuseMap? map(String key) => _data[key] is Map
      ? FuseMap(Map<String, dynamic>.from(_data[key] as Map))
      : null;

  // ── Complex types ─────────────────────────────────────────────────────────


  Offset? offset(String key) {
    final v = _data[key];
    if (v is Map) {
      final m = FuseMap(Map<String, dynamic>.from(v));
      return Offset(m.double('x') ?? 0, m.double('y') ?? 0);
    }
    return null;
  }

  BlendMode? blendMode(String key) => parseBlendMode(_data[key] as String?);
  Clip clipBehavior(String key) => parseClip(_data[key] as String?);
  /// The value of enum [values] whose name prop [key] holds
  /// (`textAlign: "center"`), or null.
  T? enumOf<T extends Enum>(String key, List<T> values) {
    final v = _data[key];
    return v is String ? values.asNameMap()[v] : null;
  }
}

/// Turns what JS sent for a prop into a Dart value: the decoder the app
/// generates for a value type its barrels name (`show Color`).
typedef FuseDecoder = Object? Function(Object? value, FuseNode node);

class FuseNode extends FuseMap with ChangeNotifier {
  FuseNode({
    required this.id,
    required this.type,
    required this.callFunction,
    required this.registry,
    Map<String, dynamic>? props,
  }) : component = props?.remove('_component') as String?,
       super(props ?? {});

  final core.int id;
  final String type;
  final String? component;

  /// Callback to call a JS function via the bridge.
  final void Function(core.int nodeId, String name, [dynamic value])
  callFunction;

  /// Back-reference to the registry, so handles can resolve cross-node
  /// references by id (used by RPC payloads like `{ pageRef: 42 }`).
  final FuseNodeRegistry registry;

  /// The raw props map.
  Map<String, dynamic> get props => _data;

  /// The handle attached to this node, if the node's type registered one.
  /// Set once by the runtime during the `create` op; disposed on node removal.
  FuseHandle? ownHandle;

  FuseNode? parent;

  // Children are a doubly linked list threaded through the nodes (the same
  // structure as the JS mirror in renderer.ts): inserting before a sibling
  // and removing are constant time, so a keyed reorder of a long list costs
  // time proportional to the number of moves, not moves times list length.
  FuseNode? _first;
  FuseNode? _last;
  FuseNode? _prev;
  FuseNode? _next;

  /// The first child, or null. Walk with [nextSibling].
  FuseNode? get firstChild => _first;

  /// The next child of this node's parent, or null.
  FuseNode? get nextSibling => _next;

  List<FuseNode>? _cachedChildren;

  /// The child nodes in order. An unmodifiable snapshot, rebuilt after the
  /// child list changes; edit the list through ops, not through this.
  ///
  /// Empty text nodes are left out. Solid keeps one as a placeholder where a
  /// dynamic child currently renders nothing (`<Show>` while hidden), as it
  /// does in the DOM, where an empty text node takes no space. Walk
  /// [firstChild] / [nextSibling] to see every node.
  List<FuseNode> get children {
    final cached = _cachedChildren;
    if (cached != null) return cached;
    final list = <FuseNode>[];
    for (var c = _first; c != null; c = c._next) {
      if (!c.isEmptyText) list.add(c);
    }
    return _cachedChildren = List.unmodifiable(list);
  }

  /// Whether this is a text node with no text (see [children]).
  core.bool get isEmptyText => type == '__text__' && _data['text'] == '';

  /// Set a text node's text.
  void setTextSilent(Object? text) {
    final wasEmpty = isEmptyText;
    _data['text'] = text;
    // Appearing in or leaving the parent's [children].
    if (wasEmpty != isEmptyText) parent?._childrenChanged();
  }

  List<Widget>? _cachedChildWidgets;

  List<Widget> get childWidgets {
    return _cachedChildWidgets ??= children
        .map((c) => FuseNodeWidget(node: c))
        .toList();
  }

  /// Whether this node takes part in its parent's layout. A node that
  /// draws elsewhere (a `<modal>` shows in a route) is mounted with its
  /// parent but never laid out as one of its children.
  core.bool get inFlow => !registry.elsewhere.contains(type);

  /// Prop [key] as a [T], decoded the way generated widgets decode it: its
  /// constants (`Colors.red`), its builders (`EdgeInsets.all(8)`) and its
  /// shorthands (`"#ff8800"`, `{ horizontal: 16 }`). [T] must be a value
  /// type a barrel names, so that `fuse gen` registers its decoder.
  T? value<T extends Object>(String key) {
    final v = props[key];
    if (v == null) return null;
    final decode = registry.decoders[T];
    if (decode == null) {
      throw StateError('No decoder for $T: name it in a lib/fuse.dart (`show $T`) and run fuse gen');
    }
    return decode(v, this) as T?;
  }

  /// Prop [key], a list, as [T]s decoded like [value]'s.
  List<T>? values<T extends Object>(String key) {
    final v = props[key];
    if (v == null) return null;
    final decode = registry.decoders[T];
    if (decode == null) {
      throw StateError('No decoder for $T: name it in a lib/fuse.dart (`show $T`) and run fuse gen');
    }
    return [for (final e in v as List) decode(e, this) as T];
  }

  /// The children laid out as `layout` says (a column by default), as one
  /// widget. Children that draw elsewhere are mounted beside the layout
  /// without taking part in it.
  Widget get layoutChildren {
    final all = childWidgets;
    final kids = children;
    final flow = <Widget>[], elsewhere = <Widget>[];
    for (var i = 0; i < kids.length; i++) {
      (kids[i].inFlow ? flow : elsewhere).add(all[i]);
    }
    final layout = _layout(flow);
    if (elsewhere.isEmpty) return layout;
    return Stack(
      fit: StackFit.passthrough,
      clipBehavior: Clip.none,
      children: [
        layout,
        for (final w in elsewhere) Positioned(left: 0, top: 0, width: 0, height: 0, child: w),
      ],
    );
  }

  Widget _layout(List<Widget> c) {
    if (c.isEmpty) return const SizedBox.shrink();
    final flex = map('layout');
    // A child with a `flex` share needs a Flex around it, even alone.
    final shares = children.any((c) => c.inFlow && c['flex'] is num);

    final direction = flex?.string('direction');
    final isHorizontal = direction == 'horizontal';
    final gap = flex?.double('gap') ?? 0;
    final align = flex?.string('align');
    final justify = flex?.string('justify');

    final crossAxis = switch (align) {
      'center' => CrossAxisAlignment.center,
      'end' => CrossAxisAlignment.end,
      'stretch' => CrossAxisAlignment.stretch,
      _ => CrossAxisAlignment.start,
    };

    final mainAxis = switch (justify) {
      'center' => MainAxisAlignment.center,
      'end' => MainAxisAlignment.end,
      'spaceBetween' => MainAxisAlignment.spaceBetween,
      'spaceAround' => MainAxisAlignment.spaceAround,
      'spaceEvenly' => MainAxisAlignment.spaceEvenly,
      _ => MainAxisAlignment.start,
    };

    final expand = flex?.bool('expand');
    final mainAxisSize = (expand ?? (justify != null && justify != 'start'))
        ? MainAxisSize.max
        : MainAxisSize.min;

    if (c.length == 1 &&
        !shares &&
        mainAxisSize == MainAxisSize.min &&
        mainAxis == MainAxisAlignment.start &&
        crossAxis == CrossAxisAlignment.start) {
      return c.first;
    }
    return Flex(
      direction: isHorizontal ? Axis.horizontal : Axis.vertical,
      mainAxisSize: mainAxisSize,
      mainAxisAlignment: mainAxis,
      crossAxisAlignment: crossAxis,
      spacing: gap,
      children: c,
    );
  }

  /// Returns a callback that calls the named JS function, or null if not registered.
  void Function([dynamic value])? callback(String name) {
    if (props[name] != true) return null;
    return ([value]) => callFunction(id, name, value);
  }

  /// Returns a Widget for a prop whose value is a FuseNode (orphan JSX node),
  /// or null if the prop isn't set / isn't a FuseNode.
  Widget? widget(String name) {
    final v = props[name];
    return v is FuseNode ? FuseNodeWidget(node: v) : null;
  }

  /// Resolves a handle's wrapped object.
  ///
  /// With no [key], returns this node's own handle's object (if it has a
  /// handle wrapping type [T]).
  ///
  /// With a [key], treats the prop at [key] as a FuseNode value and returns
  /// the referenced node's handle's object.
  ///
  /// Returns null if the target node has no handle, or if the handle's
  /// wrapped type doesn't match [T].
  T? handle<T>([String? key]) {
    if (key == null) {
      final h = ownHandle;
      if (h is! FuseHandle<T>) return null;
      return h.object;
    }
    final v = props[key];
    if (v is! FuseNode) {
      if (kDebugMode && v != null) {
        debugPrint(
          '[Fuse] node.handle<$T>("$key"): prop is ${v.runtimeType}, not a FuseNode',
        );
      }
      return null;
    }
    final h = v.ownHandle;
    if (h is! FuseHandle<T>) {
      if (kDebugMode) {
        debugPrint(
          '[Fuse] node.handle<$T>("$key"): target <${v.type}> handle is ${h?.runtimeType}, expected FuseHandle<$T>',
        );
      }
      return null;
    }
    return h.object;
  }

  void setPropSilent(String name, dynamic value) {
    props[name] = value;
  }

  /// Insert [child] in front of [before], or append it when [before] is
  /// null or not a child of this node. [child] must be detached.
  void insertChildSilent(FuseNode child, {FuseNode? before}) {
    assert(child.parent == null);
    if (before != null && !identical(before.parent, this)) before = null;
    child.parent = this;
    if (before != null) {
      final prev = before._prev;
      child._prev = prev;
      child._next = before;
      before._prev = child;
      if (prev != null) {
        prev._next = child;
      } else {
        _first = child;
      }
    } else {
      final last = _last;
      child._prev = last;
      _last = child;
      if (last != null) {
        last._next = child;
      } else {
        _first = child;
      }
    }
    _childrenChanged();
  }

  /// Detach [child], which must be a child of this node.
  void removeChildSilent(FuseNode child) {
    assert(identical(child.parent, this));
    final prev = child._prev;
    final next = child._next;
    if (prev != null) {
      prev._next = next;
    } else {
      _first = next;
    }
    if (next != null) {
      next._prev = prev;
    } else {
      _last = prev;
    }
    child.parent = null;
    child._prev = null;
    child._next = null;
    _childrenChanged();
  }

  void _childrenChanged() {
    _cachedChildren = null;
    _cachedChildWidgets = null;
  }

  /// Notify listeners that this node has changed.
  /// Called after a batch of silent mutations is complete.
  void markDirty() {
    notifyListeners();
  }

  bool _released = false;
  bool _disposed = false;

  /// JS let go of this node (the `dispose` op). It stays usable while a
  /// widget still listens to it: a route animating out, a hero flight or an
  /// exit transition keeps drawing it, and may even mount it again. It is
  /// disposed once nothing listens.
  void release() {
    _released = true;
    if (!hasListeners) dispose();
  }

  @override
  void removeListener(VoidCallback listener) {
    super.removeListener(listener);
    // After the frame's unmounts: a widget moved in the same frame listens
    // again before this runs.
    if (_released && !_disposed && !hasListeners) scheduleMicrotask(_disposeIfUnused);
  }

  void _disposeIfUnused() {
    if (!_disposed && !hasListeners) dispose();
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    ownHandle?.dispose();
    super.dispose();
  }
}

class FuseNodeRegistry {
  FuseNodeRegistry({required this.callFunction, this.callFunctionAsync, this.callFunctionSync, this.unbuild, this.send});

  /// Sends a message to JS on a channel. Null where there is no JS (tests).
  final void Function(String channel, Map<String, dynamic> data)? send;

  final _jsStreams = <int, StreamController<Object?>>{};

  /// The stream JS registered as [id] (an async iterable it gave Dart). JS
  /// reads it once Dart listens, and stops when Dart cancels.
  Stream<Object?> jsStream(core.int id) {
    late final StreamController<Object?> c;
    c = StreamController<Object?>(
      onListen: () {
        _jsStreams[id] = c;
        send?.call('_jsStream', {'id': id, 'op': 'listen'});
      },
      onCancel: () {
        if (_jsStreams.remove(id) != null) send?.call('_jsStream', {'id': id, 'op': 'cancel'});
      },
    );
    return c.stream;
  }

  /// An event of a stream JS gives: `v` a value, `e` an error, `d` done.
  void jsStreamEvent(Map<String, dynamic> data) {
    final id = data['id'] as core.int;
    final c = _jsStreams[id];
    if (c == null) return;
    if (data.containsKey('e')) {
      c.addError(FuseCallbackError('stream', '${data['e']}'));
    } else if (data['d'] == true) {
      _jsStreams.remove(id);
      c.close();
    } else {
      c.add(data['v']);
    }
  }

  /// Callback to call a JS function via the bridge.
  final void Function(core.int nodeId, String name, [dynamic value])
  callFunction;

  /// Calls a JS function and waits for what it returns (a Promise is
  /// awaited). Null where there is no JS behind the registry (tests).
  final Future<Object?> Function(core.int nodeId, String name, [dynamic value])?
  callFunctionAsync;

  /// Calls a JS function and blocks until it returns (a builder). With
  /// `widget`, the result is the built node and the root that holds it,
  /// released with [unbuild]. Null where there is no JS (tests).
  final (Object?, core.int?) Function(core.int nodeId, String name, Object? value, {core.bool widget})?
  callFunctionSync;

  /// Releases a root [callFunctionSync] built a widget in.
  final void Function(core.int root)? unbuild;

  final _nodes = <int, FuseNode>{};

  /// Node types that draw elsewhere and take no part in layout
  /// (`registerWidget(..., inFlow: false)`).
  final elsewhere = <String>{};

  /// Value type -> decoder, for [FuseNode.value] (`registerDecoder`).
  final decoders = <Type, FuseDecoder>{};

  // Handles by object, for references Dart sends to JS ([lend]). A handle
  // JS created is found by its object; one Dart hands out is borrowed, once
  // per object and type (the static type decides what JS can call).
  Expando<FuseNode> _owned = Expando();
  Expando<Map<String, FuseNode>> _borrowed = Expando();
  final _lent = <int, int>{};
  int _nextBorrowed = -1;

  /// Records that [node]'s handle, which JS created, wraps [object].
  void own(Object object, FuseNode node) => _owned[object] = node;

  /// A reference to [object] that JS turns into a handle: the one JS created
  /// for it, or a borrowed one of node type [tag] made with [borrow]. Each
  /// reference to a borrowed handle is counted until JS gives it back
  /// ([unborrow]). A new one carries its state, so JS starts with it.
  Map<String, Object?>? lend<T extends Object>(
    T? object,
    String tag,
    FuseGeneratedHandle<T> Function(FuseNode node, T object) borrow,
  ) {
    if (object == null) return null;
    final owned = _owned[object];
    if (owned != null && identical(_nodes[owned.id], owned)) return {r'$h': owned.id, 't': owned.type, 'o': 1};
    final byType = _borrowed[object] ??= {};
    final known = byType[tag];
    if (known != null && identical(_nodes[known.id], known)) {
      _lent[known.id] = (_lent[known.id] ?? 0) + 1;
      return {r'$h': known.id, 't': tag};
    }
    final node = create(_nextBorrowed--, tag, {});
    byType[tag] = node;
    _lent[node.id] = 1;
    final h = borrow(node, object);
    node.ownHandle = h;
    final s = h.takeSeed();
    return {r'$h': node.id, 't': tag, 's': ?s};
  }

  /// Node type -> how to borrow an object of it ([FuseRuntime.registerBorrow]).
  final borrows = <String, FuseGeneratedHandle Function(FuseNode node, Object object)>{};

  /// [lend] by node type, for hand-written Dart: an `Animation` crosses as
  /// `lendAs(animation, 'flutter_Animation')`. Null when the app's generated
  /// layer has no such handle (nothing in the app's JS uses the type).
  Map<String, Object?>? lendAs(Object? object, String tag) {
    final borrow = borrows[tag];
    if (object == null || borrow == null) return null;
    return lend<Object>(object, tag, (node, o) => borrow(node, o));
  }

  /// JS gave back [n] references to borrowed handle [id]; at none left the
  /// node goes (the object stays Dart's).
  void unborrow(int id, int n) {
    final left = (_lent[id] ?? 0) - n;
    if (left > 0) {
      _lent[id] = left;
      return;
    }
    _lent.remove(id);
    final node = _nodes[id];
    if (node == null) return;
    final object = node.ownHandle?.object;
    if (object != null) _borrowed[object]?.remove(node.type);
    remove(id);
  }

  FuseNode create(int id, String type, Map<String, dynamic> props) {
    final node = FuseNode(
      id: id,
      type: type,
      props: props,
      callFunction: callFunction,
      registry: this,
    );
    _nodes[id] = node;
    return node;
  }

  FuseNode get(int id) => _nodes[id]!;

  FuseNode? tryGet(int id) => _nodes[id];

  /// JS let go of node [id]: it leaves the registry now and is disposed
  /// once no widget uses it ([FuseNode.release]).
  void remove(int id) {
    final node = _nodes.remove(id);
    node?.release();
  }

  void clear() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    _nodes.clear();
    _lent.clear();
    _owned = Expando();
    _borrowed = Expando();
  }
}
