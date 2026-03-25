import 'package:flutter/material.dart';

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
    final map = Map<String, dynamic>.from(value);
    if (map.containsKey('r')) {
      final r = (map['r'] as num).toInt().clamp(0, 255);
      final g = (map['g'] as num).toInt().clamp(0, 255);
      final b = (map['b'] as num).toInt().clamp(0, 255);
      final a = ((map['a'] as num?)?.toDouble() ?? 1.0).clamp(0.0, 1.0);
      return Color.fromRGBO(r, g, b, a);
    }
    if (map.containsKey('h')) {
      final h = (map['h'] as num).toDouble() % 360;
      final s = ((map['s'] as num).toDouble() / 100).clamp(0.0, 1.0);
      final l = ((map['l'] as num).toDouble() / 100).clamp(0.0, 1.0);
      final a = ((map['a'] as num?)?.toDouble() ?? 1.0).clamp(0.0, 1.0);
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
    final map = Map<String, dynamic>.from(value);
    final all = (map['all'] as num?)?.toDouble() ?? 0;
    final h = (map['horizontal'] as num?)?.toDouble();
    final v = (map['vertical'] as num?)?.toDouble();

    final top = (map['top'] as num?)?.toDouble() ?? v ?? all;
    final bottom = (map['bottom'] as num?)?.toDouble() ?? v ?? all;
    final left = (map['left'] as num?)?.toDouble() ?? h ?? all;
    final right = (map['right'] as num?)?.toDouble() ?? h ?? all;

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
    final map = Map<String, dynamic>.from(value);
    final all = (map['all'] as num?)?.toDouble() ?? 0;

    return BorderRadius.only(
      topLeft: Radius.circular((map['topLeft'] as num?)?.toDouble() ?? all),
      topRight: Radius.circular((map['topRight'] as num?)?.toDouble() ?? all),
      bottomLeft: Radius.circular((map['bottomLeft'] as num?)?.toDouble() ?? all),
      bottomRight: Radius.circular((map['bottomRight'] as num?)?.toDouble() ?? all),
    );
  }

  return null;
}

// ─── parseBorderSide ─────────────────────────────────────────────────────────

BorderSide _parseBorderSide(dynamic value) {
  if (value is Map) {
    final map = Map<String, dynamic>.from(value);
    return BorderSide(
      width: (map['width'] as num?)?.toDouble() ?? 1,
      color: parseColor(map['color']) ?? const Color(0xFF000000),
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
  return Border.all(
    width: (map['width'] as num?)?.toDouble() ?? 1,
    color: parseColor(map['color']) ?? const Color(0xFF000000),
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
  final map = Map<String, dynamic>.from(value as Map);
  return BoxShadow(
    color: parseColor(map['color']) ?? const Color(0x40000000),
    blurRadius: (map['blurRadius'] as num?)?.toDouble() ?? 0,
    spreadRadius: (map['spreadRadius'] as num?)?.toDouble() ?? 0,
    offset: Offset(
      (map['offsetX'] as num?)?.toDouble() ?? 0,
      (map['offsetY'] as num?)?.toDouble() ?? 0,
    ),
  );
}


// ─── parseGradient ───────────────────────────────────────────────────────────

/// Accepts map with type?, colors, begin?, end?, stops?, center?, radius?.
Gradient? parseGradient(dynamic value) {
  if (value == null || value is! Map) return null;

  final map = Map<String, dynamic>.from(value);
  final type = map['type'] as String? ?? 'linear';
  final colors = (map['colors'] as List?)
      ?.map((c) => parseColor(c) ?? Colors.transparent)
      .toList();
  if (colors == null || colors.isEmpty) return null;

  final stops = (map['stops'] as List?)?.map((s) => (s as num).toDouble()).toList();

  if (type == 'radial') {
    return RadialGradient(
      colors: colors,
      stops: stops,
      center: _parseAlignment(map['center'] as String?) ?? Alignment.center,
      radius: (map['radius'] as num?)?.toDouble() ?? 0.5,
    );
  }

  return LinearGradient(
    colors: colors,
    stops: stops,
    begin: _parseAlignment(map['begin'] as String?) ?? Alignment.topCenter,
    end: _parseAlignment(map['end'] as String?) ?? Alignment.bottomCenter,
  );
}

// ─── parseDecorationImage ────────────────────────────────────────────────────

/// Accepts map with url, fit?.
DecorationImage? parseDecorationImage(dynamic value) {
  if (value == null || value is! Map) return null;

  final map = Map<String, dynamic>.from(value);
  final url = map['url'] as String?;
  if (url == null) return null;

  return DecorationImage(
    image: NetworkImage(url),
    fit: _parseBoxFit(map['fit'] as String?),
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
