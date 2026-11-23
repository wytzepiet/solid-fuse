import 'package:flutter/widgets.dart';

// Enum props whose JS names differ from Flutter's own or have a default.
// Every Flutter value type a prop takes is decoded by the decoders fuse gen
// registers (`FuseNode.value`).

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

