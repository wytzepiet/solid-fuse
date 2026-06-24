import 'package:flutter/material.dart';
import 'package:heroine/heroine.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '../motion.dart';
import '../shuttle.dart';

/// A spring-based Hero (the `heroine` package). Wrap an origin and a
/// destination with the same `tag` to animate one into the other across a
/// route push. Needs a `HeroineController` navigator observer installed
/// (see `createHeroineController`).
class FuseHeroine extends StatelessWidget {
  const FuseHeroine(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final fit = node.string('fit');
    final child = node.flexChildren;
    return Heroine(
      tag: node.string('tag') ?? '',
      motion: parseMotion(node.map('motion')),
      flightShuttleBuilder: parseShuttle(node.props['shuttle']),
      zIndex: node.int('zIndex'),
      child: fit == null
          ? child
          : FittedBox(fit: node.boxFit('fit'), child: child),
    );
  }
}
