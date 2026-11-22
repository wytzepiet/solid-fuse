// Not exported by fixture.dart: reached through its annotations only.
import 'package:flutter/widgets.dart';
import 'package:solid_fuse/solid_fuse.dart';

import 'types.dart';

/// A widget of the app's own.
@fuse
class Badge extends StatelessWidget {
  const Badge({super.key, required this.label, this.at = const Point(0)});
  final String label;
  final Point at;
  @override
  Widget build(BuildContext context) => Text(label);
}

/// Not annotated: not exported.
class Unmarked extends StatelessWidget {
  const Unmarked({super.key});
  @override
  Widget build(BuildContext context) => const SizedBox();
}

/// A handle that is not a Listenable: exported because it is annotated.
@fuse
class Tally {
  int total = 0;
  void bump() => total++;
}

/// `3` is `Point(3, 3)`.
@fuseShorthand
Point pointSquare(double v) => Point(v, v);
