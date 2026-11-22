/// The short forms `fuse gen` offers for Flutter values: `padding={8}`,
/// `borderRadius={12}`, `color="#ff8800"`, `duration={300}`.
library;

import 'package:flutter/widgets.dart';

import 'src/annotations.dart';

/// `8` is `EdgeInsets.all(8)`.
@fuseShorthand
EdgeInsets edgeInsetsAll(double value) => EdgeInsets.all(value);

/// `12` is `BorderRadius.circular(12)`.
@fuseShorthand
BorderRadius borderRadiusCircular(double radius) => BorderRadius.circular(radius);

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
