// Micro-benchmark: how much does prop decoding cost per widget rebuild, and how
// much would a generated decoder save?
//
// Pure Dart (no Flutter) so it runs under `dart run` / `dart compile exe`.
// Color/EdgeInsets are stand-ins with the same shape as dart:ui's; the parse
// functions are trimmed copies of packages/solid-fuse/dart/lib/src/utils.dart
// (parseColor, parseEdgeInsets) and node.dart (FuseMap accessors).
//
// Variants, all decoding the same 12-prop "view-like" node:
//   A  current:      Map<String,dynamic> + FuseMap accessors + lenient parsers,
//                    re-run on every build (what FuseViewWidget.build does).
//   B  generated:    same string-keyed map, but a generated decoder with strict
//                    canonical inputs (color = int ARGB, insets = [l,t,r,b]) --
//                    i.e. coercion moved to JS.
//   C  slots:        positional List<Object?> wire format (Nitro-style fixed
//                    slots), strict canonical inputs.
//   D  decode-once:  B, but decoded at setProp time into a typed props object;
//                    build only reads fields (measures the read side only).
//   E  validate:     B plus a dev-mode schema check of every prop (type tag
//                    switch) -- the cost of runtime validation.
import 'dart:core';

class Color { const Color(this.value); final int value; }
class EdgeInsets {
  const EdgeInsets.fromLTRB(this.l, this.t, this.r, this.b);
  const EdgeInsets.all(double v) : l = v, t = v, r = v, b = v;
  final double l, t, r, b;
}

// ── A: current FuseMap style ────────────────────────────────────────────────
const _named = <String, Color>{
  'red': Color(0xFFF44336), 'blue': Color(0xFF2196F3), 'green': Color(0xFF4CAF50),
  'white': Color(0xFFFFFFFF), 'black': Color(0xFF000000), 'grey': Color(0xFF9E9E9E),
};
Color? parseColor(dynamic value) {
  if (value == null) return null;
  if (value is String) {
    final n = _named[value];
    if (n != null) return n;
    var hex = value.startsWith('#') ? value.substring(1) : value;
    if (hex.length == 3) hex = hex.split('').map((c) => '$c$c').join();
    if (hex.length == 6) return Color(0xFF000000 | int.parse(hex, radix: 16));
    if (hex.length == 8) {
      final v = int.parse(hex, radix: 16);
      return Color(((v & 0xFF) << 24) | (v >> 8));
    }
    return null;
  }
  if (value is Map) {
    final r = (value['r'] as num?)?.toInt() ?? 0;
    final g = (value['g'] as num?)?.toInt() ?? 0;
    final b = (value['b'] as num?)?.toInt() ?? 0;
    final a = (value['a'] as num?)?.toDouble() ?? 1.0;
    return Color(((a * 255).round() << 24) | (r << 16) | (g << 8) | b);
  }
  return null;
}
EdgeInsets? parseEdgeInsets(dynamic value) {
  if (value == null) return null;
  if (value is num) return EdgeInsets.all(value.toDouble());
  if (value is Map) {
    final m = FuseMap(Map<String, dynamic>.from(value));
    final all = m.dbl('all') ?? 0;
    final h = m.dbl('horizontal'), v = m.dbl('vertical');
    return EdgeInsets.fromLTRB(
      m.dbl('left') ?? h ?? all, m.dbl('top') ?? v ?? all,
      m.dbl('right') ?? h ?? all, m.dbl('bottom') ?? v ?? all);
  }
  return null;
}
class FuseMap {
  const FuseMap(this._data);
  final Map<String, dynamic> _data;
  double? dbl(String k) => _data[k] is num ? (_data[k] as num).toDouble() : null;
  int? integer(String k) => _data[k] is num ? (_data[k] as num).toInt() : null;
  bool? boolean(String k) => _data[k] as bool?;
  String? string(String k) => _data[k] as String?;
  FuseMap? map(String k) => _data[k] is Map ? FuseMap(Map<String, dynamic>.from(_data[k] as Map)) : null;
  Color? color(String k) => parseColor(_data[k]);
  EdgeInsets? edgeInsets(String k) => parseEdgeInsets(_data[k]);
}

// The decoded result every variant must produce.
class ViewProps {
  ViewProps(this.padding, this.margin, this.width, this.height, this.minWidth, this.maxWidth,
      this.aspectRatio, this.color, this.opacity, this.visible, this.grow, this.clip, this.gap, this.direction);
  final EdgeInsets? padding, margin;
  final double? width, height, minWidth, maxWidth, aspectRatio, opacity, gap;
  final Color? color;
  final bool visible;
  final int? grow;
  final String? clip, direction;
}

ViewProps decodeA(FuseMap n) {
  final flex = n.map('flex');
  final deco = n.map('decoration');
  return ViewProps(
    n.edgeInsets('padding'), n.edgeInsets('margin'), n.dbl('width'), n.dbl('height'),
    n.dbl('minWidth'), n.dbl('maxWidth'), n.dbl('aspectRatio'), deco?.color('color'),
    n.dbl('opacity'), n.boolean('visible') ?? true, n.integer('grow'), n.string('clipBehavior'),
    flex?.dbl('gap'), flex?.string('direction'));
}

// ── B: generated decoder, string keys, canonical wire values ────────────────
EdgeInsets? _insets(Object? v) {
  if (v == null) return null;
  final l = v as List;
  return EdgeInsets.fromLTRB((l[0] as num).toDouble(), (l[1] as num).toDouble(),
      (l[2] as num).toDouble(), (l[3] as num).toDouble());
}
double? _d(Object? v) => (v as num?)?.toDouble();
ViewProps decodeB(Map<String, dynamic> m) {
  final c = m['color'];
  return ViewProps(_insets(m['padding']), _insets(m['margin']), _d(m['width']), _d(m['height']),
      _d(m['minWidth']), _d(m['maxWidth']), _d(m['aspectRatio']), c == null ? null : Color(c as int),
      _d(m['opacity']), m['visible'] as bool? ?? true, (m['grow'] as num?)?.toInt(),
      m['clipBehavior'] as String?, _d(m['gap']), m['direction'] as String?);
}

// ── C: positional slots ─────────────────────────────────────────────────────
ViewProps decodeC(List<Object?> s) {
  final c = s[7];
  return ViewProps(_insets(s[0]), _insets(s[1]), _d(s[2]), _d(s[3]), _d(s[4]), _d(s[5]), _d(s[6]),
      c == null ? null : Color(c as int), _d(s[8]), s[9] as bool? ?? true, (s[10] as num?)?.toInt(),
      s[11] as String?, _d(s[12]), s[13] as String?);
}

// ── E: dev-mode validation against a schema ─────────────────────────────────
const tNum = 0, tBool = 1, tStr = 2, tInsets = 3, tColor = 4, tEnum = 5;
const schema = <String, (int, List<String>?)>{
  'padding': (tInsets, null), 'margin': (tInsets, null), 'width': (tNum, null), 'height': (tNum, null),
  'minWidth': (tNum, null), 'maxWidth': (tNum, null), 'aspectRatio': (tNum, null), 'color': (tColor, null),
  'opacity': (tNum, null), 'visible': (tBool, null), 'grow': (tNum, null),
  'clipBehavior': (tEnum, ['none', 'hardEdge', 'antiAlias']), 'gap': (tNum, null),
  'direction': (tEnum, ['horizontal', 'vertical']),
};
int validate(Map<String, dynamic> m) {
  var errors = 0;
  m.forEach((k, v) {
    final s = schema[k];
    if (s == null) { errors++; return; } // unknown prop
    if (v == null) return;
    final ok = switch (s.$1) {
      tNum => v is num, tBool => v is bool, tStr => v is String,
      tInsets => v is List && v.length == 4, tColor => v is int,
      tEnum => v is String && s.$2!.contains(v), _ => false,
    };
    if (!ok) errors++;
  });
  return errors;
}

int sink = 0;
void use(ViewProps p) {
  sink += (p.width ?? 0).toInt() + (p.padding?.l ?? 0).toInt() + (p.color?.value ?? 0) + (p.visible ? 1 : 0);
}

double bench(String name, void Function() body, {int iters = 2000000}) {
  for (var i = 0; i < 200000; i++) body(); // warm-up
  final sw = Stopwatch()..start();
  for (var i = 0; i < iters; i++) body();
  final ns = sw.elapsedMicroseconds * 1000 / iters;
  print('${name.padRight(46)} ${ns.toStringAsFixed(1).padLeft(8)} ns/decode');
  return ns;
}

void main() {
  // What JS sends today for <View padding={{horizontal:16,vertical:8}} margin={8} ...>
  final current = <String, dynamic>{
    '_component': 'Card',
    'padding': {'horizontal': 16, 'vertical': 8}, 'margin': 8, 'width': 320, 'height': 120.5,
    'minWidth': 100, 'maxWidth': 600, 'aspectRatio': 1.5,
    'decoration': {'color': '#3366FF', 'borderRadius': 12}, 'opacity': 0.9, 'visible': true,
    'grow': 1, 'clipBehavior': 'antiAlias', 'flex': {'gap': 8, 'direction': 'horizontal'},
  };
  final currentNamed = Map<String, dynamic>.from(current)..['decoration'] = {'color': 'blue'};
  // Canonical (coerced-in-JS) forms of the same props.
  final canonical = <String, dynamic>{
    'padding': [16, 8, 16, 8], 'margin': [8, 8, 8, 8], 'width': 320, 'height': 120.5,
    'minWidth': 100, 'maxWidth': 600, 'aspectRatio': 1.5, 'color': 0xFF3366FF, 'opacity': 0.9,
    'visible': true, 'grow': 1, 'clipBehavior': 'antiAlias', 'gap': 8, 'direction': 'horizontal',
  };
  final slots = <Object?>[
    [16, 8, 16, 8], [8, 8, 8, 8], 320, 120.5, 100, 600, 1.5, 0xFF3366FF, 0.9, true, 1, 'antiAlias', 8, 'horizontal',
  ];
  final nodeA = FuseMap(current), nodeA2 = FuseMap(currentNamed);
  final decoded = decodeB(canonical);

  print('Decoding one 14-prop view node (AOT numbers are the ones that matter):\n');
  final a = bench('A  current FuseMap + lenient parse (hex color)', () => use(decodeA(nodeA)));
  final a2 = bench('A\' current FuseMap + lenient parse (named)', () => use(decodeA(nodeA2)));
  final b = bench('B  generated, string keys, canonical values', () => use(decodeB(canonical)));
  final c = bench('C  generated, positional slots', () => use(decodeC(slots)));
  final d = bench('D  decode-once: read typed fields only', () => use(decoded));
  final e = bench('E  B + dev-mode schema validation', () { sink += validate(canonical); use(decodeB(canonical)); });
  print('\nA/B = ${(a / b).toStringAsFixed(1)}x   B/C = ${(b / c).toStringAsFixed(1)}x   '
      'A-B = ${(a - b).toStringAsFixed(0)} ns   B-C = ${(b - c).toStringAsFixed(0)} ns   '
      'validation = +${(e - b).toStringAsFixed(0)} ns  (A\'=${a2.toStringAsFixed(0)}, D=${d.toStringAsFixed(1)})');
  print('Budget reference: one 120 Hz frame = 8,333,333 ns.  sink=$sink');
}
