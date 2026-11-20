// ignore_for_file: deprecated_member_use
// Hand-written runtime support for generated adapters. Everything the
// generator emits calls into this file plus solid_fuse's FuseNode.
import 'package:flutter/material.dart';
import 'package:solid_fuse/solid_fuse.dart';
// parseColor is not exported from the solid_fuse barrel.
// ignore: implementation_imports
import 'package:solid_fuse/src/utils.dart' show parseColor;

// ── primitives ──────────────────────────────────────────────────────────────

bool? decBool(Object? v) => v as bool?;
int? decInt(Object? v) => (v as num?)?.toInt();
double? decDouble(Object? v) => (v as num?)?.toDouble();
num? decNum(Object? v) => v as num?;
String? decString(Object? v) => v as String?;

T? fuseEnum<T extends Enum>(List<T> values, Object? v) =>
    v == null ? null : values.byName(v as String);

List<T>? fuseList<T>(Object? v, T Function(Object? e) f) =>
    (v as List?)?.map(f).toList();

Map<K, V>? fuseMap<K, V>(
  Object? v,
  K Function(String k) kf,
  V Function(Object? e) vf,
) =>
    (v as Map?)?.map((k, e) => MapEntry(kf(k as String), vf(e)));

/// A required prop was not supplied.
T fuseReq<T>(T? v, String owner, String name) {
  if (v == null) {
    throw ArgumentError('$owner: required prop "$name" is missing');
  }
  return v;
}

Never fuseBad(String type, Object? v) =>
    throw ArgumentError('Cannot decode $type from ${v.runtimeType}: $v');

/// JSON cannot carry NaN / infinity.
Object? fuseNum(num? v) => v == null || v.isFinite ? v : v.toString();

// ── children / slots ────────────────────────────────────────────────────────

/// JSX children -> a single `child:`. Zero children = null; one = itself;
/// many = solid-fuse's existing `flex` convention (Column by default).
Widget? fuseChild(FuseNode node) =>
    node.children.isEmpty ? null : node.flexChildren;

/// Text content rule: concatenated text children (same as FuseText).
String fuseText(FuseNode node) {
  final b = StringBuffer();
  for (final c in node.children) {
    if (c.type == '__text__') {
      b.write(c.props['text'] ?? '');
    } else {
      b.write(fuseText(c));
    }
  }
  return b.toString();
}

/// A `List<Widget>` prop that is not `children` (AppBar.actions, ...).
/// NOTE: the current renderer only turns a *top-level* FuseNode prop value
/// into `{_node: id}`; arrays of nodes need the same treatment there. The
/// adapter side is ready for either a resolved FuseNode or nothing.
List<Widget>? fuseWidgetList(FuseNode node, String name) {
  final v = node.props[name];
  if (v is FuseNode) return [FuseNodeWidget(node: v)];
  if (v is List) {
    return [
      for (final e in v)
        if (e is FuseNode) FuseNodeWidget(node: e),
    ];
  }
  return null;
}

/// `PreferredSizeWidget` slots (Scaffold.appBar, AppBar.bottom): a
/// FuseNodeWidget is not a PreferredSizeWidget, and the size must be known
/// before layout. HACK: fixed toolbar height unless the slot node carries a
/// numeric `preferredHeight` prop.
PreferredSizeWidget? fusePreferredSize(FuseNode node, String name) {
  final v = node.props[name];
  if (v is! FuseNode) return null;
  final h = (v.props['preferredHeight'] as num?)?.toDouble() ?? kToolbarHeight;
  return PreferredSize(
    preferredSize: Size.fromHeight(h),
    child: FuseNodeWidget(node: v),
  );
}

// ── "nice" codec overrides (see tool/src/overrides.dart) ────────────────────
// Each returns null when the value is not in its nice form.

Color? niceColor(Object? v) =>
    v is String && (v.startsWith('#') || !v.contains('.')) || (v is Map && (v['r'] != null || v['h'] != null))
        ? parseColor(v)
        : null;

String? niceEncColor(Color? c) {
  if (c == null) return null;
  String h(double x) => (x * 255).round().clamp(0, 255).toRadixString(16).padLeft(2, '0');
  return '#${h(c.r)}${h(c.g)}${h(c.b)}${h(c.a)}';
}

EdgeInsets? niceEdgeInsets(Object? v) =>
    v is num ? EdgeInsets.all(v.toDouble()) : null;

BorderRadius? niceBorderRadius(Object? v) =>
    v is num ? BorderRadius.circular(v.toDouble()) : null;

Radius? niceRadius(Object? v) => v is num ? Radius.circular(v.toDouble()) : null;

Duration? niceDuration(Object? v) =>
    v is num ? Duration(microseconds: (v * 1000).round()) : null;

num? niceEncDuration(Duration? d) => d == null ? null : d.inMicroseconds / 1000;

FontWeight? niceFontWeight(Object? v) =>
    v is num && v >= 100 && v <= 900 && v % 100 == 0 ? FontWeight.values[v ~/ 100 - 1] : null;

/// IconData cannot be derived (its params are @mustBeConst so the icon font
/// can be tree-shaken); this codec knowingly gives that up, like FuseIcon.
IconData? niceIconData(Object? v) {
  if (v is! Map) return null;
  return IconData(
    // ignore: non_const_argument_for_const_parameter
    (v['codePoint'] as num).toInt(),
    // ignore: non_const_argument_for_const_parameter
    fontFamily: v['fontFamily'] as String? ?? 'MaterialIcons',
    // ignore: non_const_argument_for_const_parameter
    fontPackage: v['fontPackage'] as String?,
    matchTextDirection: v['matchTextDirection'] as bool? ?? false,
  );
}

// ── objects spike additions ─────────────────────────────────────────────────

Uri? niceUri(Object? v) => v is String ? Uri.parse(v) : null;
String? niceEncUri(Uri? u) => u?.toString();

DateTime? niceDateTime(Object? v) => v is String
    ? DateTime.parse(v)
    : v is num
        ? DateTime.fromMillisecondsSinceEpoch(v.toInt())
        : null;
String? niceEncDateTime(DateTime? d) => d?.toIso8601String();

/// Deep equality for encoded (JSON-like) snapshots of collection state.
bool fuseSame(Object? a, Object? b) {
  if (identical(a, b)) return true;
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!fuseSame(a[i], b[i])) return false;
    }
    return true;
  }
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !fuseSame(a[k], b[k])) return false;
    }
    return true;
  }
  return a == b;
}
