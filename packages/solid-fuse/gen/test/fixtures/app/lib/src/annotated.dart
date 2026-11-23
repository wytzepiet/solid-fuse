// Not exported by fixture.dart: the barrel (lib/fuse.dart) exports it.
import 'package:flutter/widgets.dart';
import 'package:solid_fuse/solid_fuse.dart';

import 'types.dart';

/// A widget of the app's own.
class Badge extends StatelessWidget {
  const Badge({super.key, required this.label, this.at = const Point(0)});
  final String label;
  final Point at;
  @override
  Widget build(BuildContext context) => Text(label);
}

/// Not in the barrel: not exported.
class Unmarked extends StatelessWidget {
  const Unmarked({super.key});
  @override
  Widget build(BuildContext context) => const SizedBox();
}

/// A handle that is not a Listenable: a controller because the barrel names it.
class Tally {
  int total = 0;
  void bump() => total++;
}

/// `3` is `Point(3, 3)`.
@fuseShorthand
Point pointSquare(double v) => Point(v, v);

/// `{ x, y }` is `Point(x, y)`: an object short form, so the plain
/// constructor needs its tag.
@fuseShorthand
Point pointAt({double x = 0, double y = 0}) => Point(x, y);

/// Size belongs to Flutter: only solid_fuse may give it short forms.
@fuseShorthand
Size sizeSquare(double v) => Size(v, v);
