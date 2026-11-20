// The "nice input" registry: hand-written codecs that sit IN FRONT of the
// derived codec for a type. This is the only per-type knowledge in the
// generator. Each entry names functions in lib/fuse_gen_support.dart.
//
// A decode hook has the shape `T? Function(Object? v)` and returns null when
// the value is not in its nice form, so the derived (constructor / constant)
// forms keep working: overrides *extend* the derived union unless `replace`.

class CodecOverride {
  const CodecOverride({
    required this.type,
    required this.tsIn,
    required this.decode,
    this.inherit = false,
    this.replace = false,
    this.tsOut,
    this.encode,
  });

  /// Element name; matched for types from dart:ui / package:flutter.
  final String type;

  /// Extra TS input type (unioned with the derived one).
  final String tsIn;

  /// Dart function name in fuse_gen_support.dart.
  final String decode;

  /// Also applies when [type] appears as one arm of a supertype's union
  /// (EdgeInsets inside EdgeInsetsGeometry).
  final bool inherit;

  /// Drop the derived union entirely.
  final bool replace;

  /// Dart -> JS direction (callback payloads).
  final String? tsOut;
  final String? encode;
}

const defaultOverrides = <CodecOverride>[
  // objects spike: "https://x" -> Uri.parse (plugin APIs take Uri everywhere)
  CodecOverride(type: 'Uri', tsIn: 'string', decode: 'niceUri', replace: true, tsOut: 'string', encode: 'niceEncUri'),
  // objects spike: dart:io file system entities cross as their path
  CodecOverride(type: 'Directory', tsIn: 'string', decode: 'niceDirectory', replace: true, tsOut: 'string', encode: 'niceEncPath'),
  CodecOverride(type: 'File', tsIn: 'string', decode: 'niceFile', replace: true, tsOut: 'string', encode: 'niceEncPath'),
  // objects spike: ISO-8601 string / epoch ms
  CodecOverride(type: 'DateTime', tsIn: 'string | number', decode: 'niceDateTime', replace: true, tsOut: 'string', encode: 'niceEncDateTime'),
  // "#rrggbb" / "#rrggbbaa" / "red" / {r,g,b,a} / {h,s,l,a}: reuses solid-fuse's parseColor.
  CodecOverride(
      type: 'Color',
      tsIn: 'ColorInput',
      decode: 'niceColor',
      inherit: true,
      tsOut: 'string',
      encode: 'niceEncColor'),
  // 8 -> EdgeInsets.all(8)
  CodecOverride(type: 'EdgeInsets', tsIn: 'number', decode: 'niceEdgeInsets', inherit: true),
  // 12 -> BorderRadius.circular(12)
  CodecOverride(type: 'BorderRadius', tsIn: 'number', decode: 'niceBorderRadius', inherit: true),
  // 12 -> Radius.circular(12)
  CodecOverride(type: 'Radius', tsIn: 'number', decode: 'niceRadius'),
  // 300 -> Duration(milliseconds: 300)
  CodecOverride(
      type: 'Duration',
      tsIn: 'number',
      decode: 'niceDuration',
      tsOut: 'number',
      encode: 'niceEncDuration'),
  // 700 -> FontWeight.w700
  CodecOverride(type: 'FontWeight', tsIn: '100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900', decode: 'niceFontWeight'),
  // IconData's constructor params are @mustBeConst (icon-font tree shaking) and the
  // Icons namespace has ~8.9k constants, so nothing usable is derived: codec only.
  CodecOverride(
      type: 'IconData',
      tsIn: '{ codePoint: number; fontFamily?: string; fontPackage?: string; matchTextDirection?: boolean }',
      decode: 'niceIconData',
      replace: true),
];

/// Per-widget hints: which Widget / List<Widget> parameter JSX children map to
/// when the constructor has no `child` / `children` parameter.
const defaultChildrenHints = <String, String>{
  'Scaffold': 'body',
  'CustomScrollView': 'slivers',
};
