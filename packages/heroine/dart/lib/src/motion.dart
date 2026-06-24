import 'package:flutter/widgets.dart';
import 'package:motor/motor.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// Parses a JS `HeroineMotion` map into a `motor` [Motion].
///
/// The JS API owns its own `{ kind, ... }` shape; this is the single place
/// that maps it onto motor's class hierarchy, so the public surface stays
/// insulated from motor's layout.
Motion parseMotion(
  FuseMap? m, {
  Motion fallback = const CupertinoMotion.smooth(),
}) {
  if (m == null) return fallback;

  final snap = m.bool('snapToEnd') ?? false;
  Duration dur(int fallbackMs) =>
      Duration(milliseconds: m.int('durationMs') ?? fallbackMs);

  switch (m.string('kind') ?? 'cupertino') {
    case 'spring':
      return SpringMotion(
        SpringDescription(
          mass: m.double('mass') ?? 1,
          stiffness: m.double('stiffness') ?? 500,
          damping: m.double('damping') ?? 20,
        ),
        snapToEnd: snap,
      );

    case 'curved':
      return CurvedMotion(
        dur(300),
        m.string('curve') != null ? m.curve('curve') : Curves.fastOutSlowIn,
      );

    case 'linear':
      return LinearMotion(dur(300));

    case 'none':
      return const NoMotion();

    case 'material':
      return _material(m.string('variant'), snap);

    case 'cupertino':
    default:
      final bounce = m.double('bounce') ?? 0;
      // For a named variant, `bounce` is *extra* bounce; the plain spring
      // takes it as the absolute bounce.
      return switch (m.string('variant')) {
        'bouncy' => CupertinoMotion.bouncy(
            duration: dur(500),
            extraBounce: bounce,
            snapToEnd: snap,
          ),
        'snappy' => CupertinoMotion.snappy(
            duration: dur(500),
            extraBounce: bounce,
            snapToEnd: snap,
          ),
        'interactive' => CupertinoMotion.interactive(
            duration: dur(150),
            extraBounce: bounce,
            snapToEnd: snap,
          ),
        'smooth' => CupertinoMotion.smooth(
            duration: dur(500),
            extraBounce: bounce,
            snapToEnd: snap,
          ),
        _ => CupertinoMotion(
            duration: dur(550),
            bounce: bounce,
            snapToEnd: snap,
          ),
      };
  }
}

Motion _material(String? variant, bool snap) => switch (variant) {
      'standardSpatialFast' =>
        MaterialSpringMotion.standardSpatialFast(snapToEnd: snap),
      'standardSpatialSlow' =>
        MaterialSpringMotion.standardSpatialSlow(snapToEnd: snap),
      'standardEffectsFast' =>
        MaterialSpringMotion.standardEffectsFast(snapToEnd: snap),
      'standardEffectsDefault' =>
        MaterialSpringMotion.standardEffectsDefault(snapToEnd: snap),
      'standardEffectsSlow' =>
        MaterialSpringMotion.standardEffectsSlow(snapToEnd: snap),
      'expressiveSpatialFast' =>
        MaterialSpringMotion.expressiveSpatialFast(snapToEnd: snap),
      'expressiveSpatialDefault' =>
        MaterialSpringMotion.expressiveSpatialDefault(snapToEnd: snap),
      'expressiveSpatialSlow' =>
        MaterialSpringMotion.expressiveSpatialSlow(snapToEnd: snap),
      'expressiveEffectsFast' =>
        MaterialSpringMotion.expressiveEffectsFast(snapToEnd: snap),
      'expressiveEffectsDefault' =>
        MaterialSpringMotion.expressiveEffectsDefault(snapToEnd: snap),
      'expressiveEffectsSlow' =>
        MaterialSpringMotion.expressiveEffectsSlow(snapToEnd: snap),
      _ => MaterialSpringMotion.standardSpatialDefault(snapToEnd: snap),
    };
