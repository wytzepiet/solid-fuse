// Fixture for solid_fuse_gen's rule tests: one example of every rule.
import 'dart:typed_data';
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
    this.measure,
    required this.weird,
    this.state,
    this.counter,
    this.onTracker,
    this.scorer,
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
  final Uint8List? weird;
  final double Function(int index)? measure;
  final Mutable? state;
  final Counter? counter;
  final ValueChanged<Tracker>? onTracker;
  final Scorer? scorer;
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
/// Takes the BuildContext it is built in (the adapter supplies it).
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

/// Typed slots: each takes the node's own widget.
class Shelf extends StatelessWidget {
  const Shelf({super.key, this.lead, this.pills = const []});
  final Pill? lead;
  final List<Pill> pills;
  @override
  Widget build(BuildContext context) => Column(children: [?lead, ...pills]);
}

class Pill extends StatelessWidget {
  const Pill({super.key, required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Text('pill $label', textDirection: TextDirection.ltr);
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

/// Widgets, callbacks and values inside values.
class Menu extends StatelessWidget {
  const Menu({super.key, required this.items, this.trailing, this.onRefresh, this.onPick});
  final List<MenuItem> items;
  final List<Widget>? trailing;
  final Future<void> Function()? onRefresh;
  final Future<int> Function(String)? onPick;
  @override
  Widget build(BuildContext context) => Column(children: [
        for (final i in items) GestureDetector(onTap: i.onTap, child: i.icon ?? Text(i.label)),
        ...?trailing,
      ]);
}

class MenuItem {
  const MenuItem(this.label, {this.onTap, this.icon});
  final String label;
  final VoidCallback? onTap;
  final Widget? icon;
}

/// Generic widget with a value generic over its type parameter: both are
/// read at the bound.
class Choice<T> extends StatelessWidget {
  const Choice({super.key, required this.options, this.onPick});
  final List<Option<T>> options;
  final ValueChanged<T>? onPick;
  @override
  Widget build(BuildContext context) => Column(children: [
        for (final o in options) GestureDetector(onTap: () => onPick?.call(o.value), child: Text(o.label)),
      ]);
}

@immutable
class Option<T> {
  const Option(this.value, this.label);
  final T value;
  final String label;
}
