/// The short forms `fuse gen` offers for Flutter values: `padding={8}`,
/// `padding={{ horizontal: 16 }}`, `borderRadius={12}`, `color="#ff8800"`,
/// `duration={300}`, `fontWeight={600}`. They apply wherever a prop takes
/// the type, on core's widgets and generated ones alike. Only solid_fuse
/// gives Flutter's types short forms; a package gives its own types theirs.
library;

import 'package:flutter/widgets.dart';

import 'src/annotations.dart';

/// `8` is `EdgeInsets.all(8)`.
@fuseShorthand
EdgeInsets edgeInsetsAll(double value) => EdgeInsets.all(value);

/// `{ horizontal: 16, top: 8 }`: a side takes its own value, else its
/// axis's (`horizontal`, `vertical`), else 0.
@fuseShorthand
EdgeInsets edgeInsetsSides({
  double? horizontal,
  double? vertical,
  double? top,
  double? right,
  double? bottom,
  double? left,
}) =>
    EdgeInsets.fromLTRB(
      left ?? horizontal ?? 0,
      top ?? vertical ?? 0,
      right ?? horizontal ?? 0,
      bottom ?? vertical ?? 0,
    );

/// `12` is `BorderRadius.circular(12)`.
@fuseShorthand
BorderRadius borderRadiusCircular(double radius) => BorderRadius.circular(radius);

/// `{ topLeft: 12, topRight: 12 }`: circular corners, 0 where not given.
@fuseShorthand
BorderRadius borderRadiusCorners({double? topLeft, double? topRight, double? bottomLeft, double? bottomRight}) =>
    BorderRadius.only(
      topLeft: Radius.circular(topLeft ?? 0),
      topRight: Radius.circular(topRight ?? 0),
      bottomLeft: Radius.circular(bottomLeft ?? 0),
      bottomRight: Radius.circular(bottomRight ?? 0),
    );

/// `12` is `Radius.circular(12)`.
@fuseShorthand
Radius radiusCircular(double radius) => Radius.circular(radius);

/// Milliseconds: `300` is `Duration(milliseconds: 300)`.
@fuseShorthand
Duration durationMs(num ms) => Duration(microseconds: (ms * 1000).round());

/// CSS hex: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`.
@FuseShorthand(ts: r'`#${string}`')
Color colorHex(String hex) {
  var h = hex.startsWith('#') ? hex.substring(1) : hex;
  if (h.length == 3 || h.length == 4) h = h.split('').map((c) => '$c$c').join();
  if (h.length == 6) h = '${h}ff';
  final v = h.length == 8 ? int.tryParse(h, radix: 16) : null;
  if (v == null) throw ArgumentError.value(hex, 'color', 'not a hex color (#rgb, #rgba, #rrggbb, #rrggbbaa)');
  // rrggbbaa -> aarrggbb
  return Color(((v & 0xff) << 24) | (v >> 8));
}

/// `{ r, g, b, a }`: red, green and blue 0-255, alpha 0-1 (default 1).
@fuseShorthand
Color colorRgb({required int r, required int g, required int b, double a = 1}) => Color.fromRGBO(r, g, b, a);

/// `600` is `FontWeight.w600`: 100 to 900, as in CSS.
@fuseShorthand
FontWeight fontWeightNumber(int weight) => FontWeight(weight);

/// `"topLeft"`, `"center"`, `"bottomRight"`...: the [Alignment] constant
/// of that name.
@FuseShorthand(ts: '"topLeft" | "topCenter" | "topRight" | "centerLeft" | "center" | "centerRight" | "bottomLeft" | "bottomCenter" | "bottomRight"')
Alignment alignmentName(String name) => switch (name) {
      'topLeft' => Alignment.topLeft,
      'topCenter' => Alignment.topCenter,
      'topRight' => Alignment.topRight,
      'centerLeft' => Alignment.centerLeft,
      'center' => Alignment.center,
      'centerRight' => Alignment.centerRight,
      'bottomLeft' => Alignment.bottomLeft,
      'bottomCenter' => Alignment.bottomCenter,
      'bottomRight' => Alignment.bottomRight,
      _ => throw ArgumentError.value(name, 'alignment', 'not an Alignment name'),
    };

/// `"underline"`, `"overline"`, `"lineThrough"` or `"none"`: the
/// [TextDecoration] constant of that name.
@FuseShorthand(ts: '"none" | "underline" | "overline" | "lineThrough"')
TextDecoration textDecorationName(String name) => switch (name) {
      'none' => TextDecoration.none,
      'underline' => TextDecoration.underline,
      'overline' => TextDecoration.overline,
      'lineThrough' => TextDecoration.lineThrough,
      _ => throw ArgumentError.value(name, 'textDecoration', 'not a TextDecoration name'),
    };

/// `[dx, dy]` is `Offset(dx, dy)`.
@FuseShorthand(ts: '[dx: number, dy: number]')
Offset offsetPair(List<double> xy) => Offset(xy[0], xy[1]);

/// `{ width, color }`: the same side all around, as `Border.all`.
@fuseShorthand
Border borderAll({double width = 1, Color color = const Color(0xFF000000)}) => Border.all(width: width, color: color);

/// `{ colors, begin, end, stops }` is a [LinearGradient]; it goes from
/// `"centerLeft"` to `"centerRight"` unless `begin` and `end` say otherwise.
@fuseShorthand
LinearGradient linearGradientOf({
  required List<Color> colors,
  List<double>? stops,
  AlignmentGeometry begin = Alignment.centerLeft,
  AlignmentGeometry end = Alignment.centerRight,
}) =>
    LinearGradient(colors: colors, stops: stops, begin: begin, end: end);
