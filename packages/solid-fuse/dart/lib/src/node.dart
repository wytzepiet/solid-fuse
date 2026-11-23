import 'dart:core' as core;
import 'dart:core';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'fuse_handle.dart';
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

  Color? color(String key) => parseColor(_data[key]);
  EdgeInsets? edgeInsets(String key) => parseEdgeInsets(_data[key]);
  BorderRadius? borderRadius(String key) => parseBorderRadius(_data[key]);
  Border? border(String key) => parseBorder(_data[key]);
  List<BoxShadow>? boxShadows(String key) => parseBoxShadows(_data[key]);
  Gradient? gradient(String key) => parseGradient(_data[key]);
  DecorationImage? decorationImage(String key) =>
      parseDecorationImage(_data[key]);
  BoxDecoration? boxDecoration(String key) => parseBoxDecoration(_data[key]);
  Offset? offset(String key) {
    final v = _data[key];
    if (v is Map) {
      final m = FuseMap(Map<String, dynamic>.from(v));
      return Offset(m.double('x') ?? 0, m.double('y') ?? 0);
    }
    return null;
  }

  Alignment? alignment(String key) => parseAlignment(_data[key] as String?);
  BlendMode? blendMode(String key) => parseBlendMode(_data[key] as String?);
  Clip clipBehavior(String key) => parseClip(_data[key] as String?);
  FontWeight? fontWeight(String key) => parseFontWeight(_data[key]);
}

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

  Widget get flexChildren {
    final flex = map('flex');

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

    final c = childWidgets;
    if (c.length == 1 &&
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

  @override
  void dispose() {
    ownHandle?.dispose();
    super.dispose();
  }
}

class FuseNodeRegistry {
  FuseNodeRegistry({required this.callFunction, this.callFunctionAsync, this.callFunctionSync, this.unbuild});

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

  void remove(int id) {
    final node = _nodes.remove(id);
    node?.dispose();
  }

  void clear() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    _nodes.clear();
  }
}
