import 'package:flutter/material.dart';

import 'node.dart';

// ─── Named colors ────────────────────────────────────────────────────────────

const _namedColors = <String, Color>{
  'red': Colors.red,
  'blue': Colors.blue,
  'green': Colors.green,
  'white': Colors.white,
  'black': Colors.black,
  'grey': Colors.grey,
  'orange': Colors.orange,
  'purple': Colors.purple,
  'yellow': Colors.yellow,
  'teal': Colors.teal,
  'cyan': Colors.cyan,
  'amber': Colors.amber,
  'indigo': Colors.indigo,
  'pink': Colors.pink,
  'brown': Colors.brown,
  'transparent': Colors.transparent,
};

// ─── parseColor ──────────────────────────────────────────────────────────────

/// Accepts:
///  - String hex: "#RGB", "#RRGGBB", "#AARRGGBB"
///  - String named: "red", "blue", etc.
///  - Map RGB: { r, g, b, a? }
///  - Map HSL: { h, s, l, a? }
Color? parseColor(dynamic value) {
  if (value == null) return null;

  if (value is String) {
    if (value.startsWith('#')) {
      final hex = value.substring(1);
      switch (hex.length) {
        case 3: // #RGB → #RRGGBB
          final r = hex[0], g = hex[1], b = hex[2];
          return Color(int.parse('FF$r$r$g$g$b$b', radix: 16));
        case 6: // #RRGGBB
          return Color(int.parse('FF$hex', radix: 16));
        case 8: // #AARRGGBB
          return Color(int.parse(hex, radix: 16));
      }
      return null;
    }
    return _namedColors[value.toLowerCase()];
  }

  if (value is Map) {
    final m = FuseMap(Map<String, dynamic>.from(value));
    if (m['r'] != null) {
      final r = (m.int('r') ?? 0).clamp(0, 255);
      final g = (m.int('g') ?? 0).clamp(0, 255);
      final b = (m.int('b') ?? 0).clamp(0, 255);
      final a = (m.double('a') ?? 1.0).clamp(0.0, 1.0);
      return Color.fromRGBO(r, g, b, a);
    }
    if (m['h'] != null) {
      final h = (m.double('h') ?? 0) % 360;
      final s = ((m.double('s') ?? 0) / 100).clamp(0.0, 1.0);
      final l = ((m.double('l') ?? 0) / 100).clamp(0.0, 1.0);
      final a = (m.double('a') ?? 1.0).clamp(0.0, 1.0);
      return HSLColor.fromAHSL(a, h, s, l).toColor();
    }
  }

  return null;
}

// ─── parseEdgeInsets ─────────────────────────────────────────────────────────

/// Accepts:
///  - num → EdgeInsets.all(value)
///  - Map with all/top/bottom/left/right/horizontal/vertical
///  - Priority: individual sides > horizontal/vertical > all
EdgeInsets? parseEdgeInsets(dynamic value) {
  if (value == null) return null;

  if (value is num) return EdgeInsets.all(value.toDouble());

  if (value is Map) {
    final m = FuseMap(Map<String, dynamic>.from(value));
    final all = m.double('all') ?? 0;
    final h = m.double('horizontal');
    final v = m.double('vertical');

    final top = m.double('top') ?? v ?? all;
    final bottom = m.double('bottom') ?? v ?? all;
    final left = m.double('left') ?? h ?? all;
    final right = m.double('right') ?? h ?? all;

    return EdgeInsets.only(top: top, bottom: bottom, left: left, right: right);
  }

  return null;
}

// ─── parseBorderRadius ───────────────────────────────────────────────────────

/// Accepts:
///  - num → BorderRadius.circular(value)
///  - Map with all/topLeft/topRight/bottomLeft/bottomRight
///  - Priority: individual corners > all
BorderRadius? parseBorderRadius(dynamic value) {
  if (value == null) return null;

  if (value is num) return BorderRadius.circular(value.toDouble());

  if (value is Map) {
    final m = FuseMap(Map<String, dynamic>.from(value));
    final all = m.double('all') ?? 0;

    return BorderRadius.only(
      topLeft: Radius.circular(m.double('topLeft') ?? all),
      topRight: Radius.circular(m.double('topRight') ?? all),
      bottomLeft: Radius.circular(m.double('bottomLeft') ?? all),
      bottomRight: Radius.circular(m.double('bottomRight') ?? all),
    );
  }

  return null;
}

// ─── parseBorderSide ─────────────────────────────────────────────────────────

BorderSide _parseBorderSide(dynamic value) {
  if (value is Map) {
    final m = FuseMap(Map<String, dynamic>.from(value));
    return BorderSide(
      width: m.double('width') ?? 1,
      color: parseColor(m['color']) ?? const Color(0xFF000000),
    );
  }
  return BorderSide.none;
}

// ─── parseBorder ─────────────────────────────────────────────────────────────

/// Accepts:
///  - Map with width/color → uniform Border.all(...)
///  - Map with top/bottom/left/right/all → per-side Border(...)
Border? parseBorder(dynamic value) {
  if (value == null || value is! Map) return null;

  final map = Map<String, dynamic>.from(value);

  // Per-side border: has top/bottom/left/right keys
  if (map.containsKey('top') || map.containsKey('bottom') ||
      map.containsKey('left') || map.containsKey('right') ||
      map.containsKey('all')) {
    final base = _parseBorderSide(map['all']);
    return Border(
      top: map.containsKey('top') ? _parseBorderSide(map['top']) : base,
      bottom: map.containsKey('bottom') ? _parseBorderSide(map['bottom']) : base,
      left: map.containsKey('left') ? _parseBorderSide(map['left']) : base,
      right: map.containsKey('right') ? _parseBorderSide(map['right']) : base,
    );
  }

  // Uniform border: { width?, color? }
  final m = FuseMap(map);
  return Border.all(
    width: m.double('width') ?? 1,
    color: parseColor(m['color']) ?? const Color(0xFF000000),
  );
}

// ─── parseBoxShadows ─────────────────────────────────────────────────────────

/// Accepts single map or list of maps.
List<BoxShadow>? parseBoxShadows(dynamic value) {
  if (value == null) return null;

  if (value is List) {
    return value.map(_parseOneBoxShadow).toList();
  }

  if (value is Map) {
    return [_parseOneBoxShadow(value)];
  }

  return null;
}

BoxShadow _parseOneBoxShadow(dynamic value) {
  final m = FuseMap(Map<String, dynamic>.from(value as Map));
  return BoxShadow(
    color: parseColor(m['color']) ?? const Color(0x40000000),
    blurRadius: m.double('blurRadius') ?? 0,
    spreadRadius: m.double('spreadRadius') ?? 0,
    offset: Offset(
      m.double('offsetX') ?? 0,
      m.double('offsetY') ?? 0,
    ),
  );
}


// ─── parseGradient ───────────────────────────────────────────────────────────

/// Accepts map with type?, colors, begin?, end?, stops?, center?, radius?.
Gradient? parseGradient(dynamic value) {
  if (value == null || value is! Map) return null;

  final m = FuseMap(Map<String, dynamic>.from(value));
  final type = m.string('type') ?? 'linear';
  final colors = (m['colors'] as List?)
      ?.map((c) => parseColor(c) ?? Colors.transparent)
      .toList();
  if (colors == null || colors.isEmpty) return null;

  final stops = (m['stops'] as List?)?.map((s) => (s as num).toDouble()).toList();

  if (type == 'radial') {
    return RadialGradient(
      colors: colors,
      stops: stops,
      center: _parseAlignment(m.string('center')) ?? Alignment.center,
      radius: m.double('radius') ?? 0.5,
    );
  }

  return LinearGradient(
    colors: colors,
    stops: stops,
    begin: _parseAlignment(m.string('begin')) ?? Alignment.topCenter,
    end: _parseAlignment(m.string('end')) ?? Alignment.bottomCenter,
  );
}

// ─── parseDecorationImage ────────────────────────────────────────────────────

/// Accepts map with url, fit?.
DecorationImage? parseDecorationImage(dynamic value) {
  if (value == null || value is! Map) return null;

  final m = FuseMap(Map<String, dynamic>.from(value));
  final url = m.string('url');
  if (url == null) return null;

  return DecorationImage(
    image: NetworkImage(url),
    fit: _parseBoxFit(m.string('fit')),
  );
}

// ─── parseAlignment ──────────────────────────────────────────────────────────

Alignment? parseAlignment(String? value) => _parseAlignment(value);

Alignment? _parseAlignment(String? value) {
  return switch (value) {
    'topLeft' => Alignment.topLeft,
    'topCenter' => Alignment.topCenter,
    'topRight' => Alignment.topRight,
    'centerLeft' => Alignment.centerLeft,
    'center' => Alignment.center,
    'centerRight' => Alignment.centerRight,
    'bottomLeft' => Alignment.bottomLeft,
    'bottomCenter' => Alignment.bottomCenter,
    'bottomRight' => Alignment.bottomRight,
    _ => null,
  };
}

// ─── parseBoxFit ─────────────────────────────────────────────────────────────

BoxFit _parseBoxFit(String? value) {
  return switch (value) {
    'contain' => BoxFit.contain,
    'cover' => BoxFit.cover,
    'fill' => BoxFit.fill,
    'fitWidth' => BoxFit.fitWidth,
    'fitHeight' => BoxFit.fitHeight,
    'none' => BoxFit.none,
    _ => BoxFit.cover,
  };
}

// ─── parseBlendMode ──────────────────────────────────────────────────────────

BlendMode? parseBlendMode(String? value) {
  return switch (value) {
    'multiply' => BlendMode.multiply,
    'screen' => BlendMode.screen,
    'overlay' => BlendMode.overlay,
    'darken' => BlendMode.darken,
    'lighten' => BlendMode.lighten,
    'colorDodge' => BlendMode.colorDodge,
    'colorBurn' => BlendMode.colorBurn,
    'hardLight' => BlendMode.hardLight,
    'softLight' => BlendMode.softLight,
    'difference' => BlendMode.difference,
    'exclusion' => BlendMode.exclusion,
    'hue' => BlendMode.hue,
    'saturation' => BlendMode.saturation,
    'color' => BlendMode.color,
    'luminosity' => BlendMode.luminosity,
    _ => null,
  };
}

// ─── parseClip ───────────────────────────────────────────────────────────────

Clip parseClip(String? value) {
  return switch (value) {
    'hardEdge' => Clip.hardEdge,
    'antiAlias' => Clip.antiAlias,
    'antiAliasWithSaveLayer' => Clip.antiAliasWithSaveLayer,
    'none' => Clip.none,
    _ => Clip.none,
  };
}
