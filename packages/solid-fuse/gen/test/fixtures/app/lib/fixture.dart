// Fixture for solid_fuse_gen's rule tests: one example of every rule.
import 'package:flutter/widgets.dart';

export 'src/types.dart';
import 'src/types.dart';

const double _privateDefault = 3;

class FixtureBox extends StatelessWidget {
  const FixtureBox({
    super.key,
    required this.at,
    this.mode = Mode.a,
    this.shape,
    this.onTap,
    this.onMove,
    this.onRefresh,
    this.builder,
    required this.weird,
    this.state,
    this.counter,
    this.size = _privateDefault,
    this.tags = const ['x'],
    this.hidden = const _Hidden(),
    this.child,
  });
  final Point at;
  final Mode mode;
  final Shape? shape;
  final VoidCallback? onTap;
  final ValueChanged<Point>? onMove;
  final Future<void> Function()? onRefresh;
  final WidgetBuilder? builder;
  final double Function()? weird;
  final Mutable? state;
  final Counter? counter;
  final double size;
  final List<String> tags;
  final Shape hidden;
  final Widget? child;
  @override
  Widget build(BuildContext context) => const SizedBox();
}

/// Named constructor and positional text.
class Label extends StatelessWidget {
  const Label(this.text, {super.key, this.chain});
  const Label.big(this.text, {super.key, this.chain});
  final String text;
  final Chain? chain;
  @override
  Widget build(BuildContext context) => const SizedBox();
}

/// A required parameter no rule covers: the whole widget is skipped.
class NeedsContext extends StatelessWidget {
  const NeedsContext({super.key, required this.ctx});
  final BuildContext ctx;
  @override
  Widget build(BuildContext context) => const SizedBox();
}

/// Required parameter of a type with no usable constructor.
class NeedsSecret extends StatelessWidget {
  const NeedsSecret({super.key, required this.secret});
  final Secret secret;
  @override
  Widget build(BuildContext context) => const SizedBox();
}

class Many extends StatelessWidget {
  const Many({super.key, this.children = const []});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => const SizedBox();
}

class _Hidden extends Shape {
  const _Hidden();
}
