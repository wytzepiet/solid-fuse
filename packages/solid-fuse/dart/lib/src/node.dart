import 'dart:core' as core;
import 'dart:core';

import 'package:flutter/material.dart';

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

  core.double? double(String key) =>
      _data[key] is num ? (_data[key] as num).toDouble() : null;
  core.int? int(String key) =>
      _data[key] is num ? (_data[key] as num).toInt() : null;
  core.bool bool(String key, [core.bool defaultValue = false]) =>
      _data[key] as core.bool? ?? defaultValue;
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
}

class FuseNode extends FuseMap with ChangeNotifier {
  FuseNode({
    required this.id,
    required this.type,
    required this.callFunction,
    Map<String, dynamic>? props,
  }) : component = props?.remove('_component') as String?,
       super(props ?? {});

  final core.int id;
  final String type;
  final String? component;

  /// Callback to call a JS function via the bridge.
  final void Function(core.int nodeId, String name, [dynamic value])
  callFunction;

  /// The raw props map.
  Map<String, dynamic> get props => _data;

  /// The native Dart object for non-widget nodes (handles).
  Object? nativeObject;

  /// Custom dispose callback, set by the runtime for handle cleanup.
  void Function()? onDispose;

  final List<FuseNode> children = [];
  FuseNode? parent;

  List<Widget>? _cachedChildWidgets;

  List<Widget> get childWidgets {
    return _cachedChildWidgets ??= children
        .map((c) => FuseNodeWidget(node: c))
        .toList();
  }

  Widget buildChildren() {
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
  void Function([dynamic value])? function(String name) {
    if (props[name] != true) return null;
    return ([value]) => callFunction(id, name, value);
  }

  void setPropSilent(String name, dynamic value) {
    props[name] = value;
  }

  void insertChildSilent(core.int index, FuseNode child) {
    children.insert(index.clamp(0, children.length), child);
    child.parent = this;
    _cachedChildWidgets = null;
  }

  void removeChildSilent(FuseNode child) {
    children.remove(child);
    child.parent = null;
    _cachedChildWidgets = null;
  }

  /// Notify listeners that this node has changed.
  /// Called after a batch of silent mutations is complete.
  void markDirty() {
    notifyListeners();
  }

  @override
  void dispose() {
    onDispose?.call();
    super.dispose();
  }
}

class FuseNodeRegistry {
  FuseNodeRegistry({required this.callFunction});

  /// Callback to call a JS function via the bridge.
  final void Function(core.int nodeId, String name, [dynamic value])
  callFunction;

  final _nodes = <int, FuseNode>{};

  FuseNode create(int id, String type, Map<String, dynamic> props) {
    final node = FuseNode(
      id: id,
      type: type,
      props: props,
      callFunction: callFunction,
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
