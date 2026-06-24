import 'package:flutter/material.dart';
import 'package:heroine/heroine.dart';
import 'package:solid_fuse/solid_fuse.dart';

/// Parses a JS `HeroineShuttle` value (a preset string, an object form, or
/// null) into a [HeroineShuttleBuilder].
///
/// Returns null when nothing is set, so `<Heroine>` falls back to its own
/// default ([FadeShuttleBuilder]).
HeroineShuttleBuilder? parseShuttle(dynamic raw) {
  if (raw == null) return null;
  if (raw is String) return _byName(raw);

  final m = FuseMap.from(raw);
  if (m == null) return null;

  final curve =
      m.string('curve') != null ? m.curve('curve') : Curves.fastOutSlowIn;

  switch (m.string('type') ?? 'fade') {
    case 'single':
      return SingleShuttleBuilder(useFromHero: m.bool('useFromHero') ?? false);

    case 'flip':
      return FlipShuttleBuilder(
        axis: m.string('axis') == 'horizontal' ? Axis.horizontal : Axis.vertical,
        flipForward: m.bool('flipForward') ?? true,
        invertFlipOnReturn: m.bool('invertFlipOnReturn') ?? false,
        halfFlips: m.int('halfFlips') ?? 1,
        curve: curve,
      );

    case 'fadeThrough':
      return FadeThroughShuttleBuilder(
        fadeColor: m.color('fadeColor') ??
            const Color.from(alpha: 1, red: 1, green: 1, blue: 1),
        curve: curve,
      );

    case 'chained':
      final builders = <HeroineShuttleBuilder>[];
      for (final b in (m['builders'] as List? ?? const [])) {
        final parsed = parseShuttle(b);
        if (parsed != null) builders.add(parsed);
      }
      return ChainedShuttleBuilder(builders: builders);

    case 'fade':
    default:
      return FadeShuttleBuilder(curve: curve);
  }
}

HeroineShuttleBuilder _byName(String name) => switch (name) {
      'flip' => const FlipShuttleBuilder(),
      'single' => const SingleShuttleBuilder(),
      'fadeThrough' => const FadeThroughShuttleBuilder(),
      _ => const FadeShuttleBuilder(),
    };
