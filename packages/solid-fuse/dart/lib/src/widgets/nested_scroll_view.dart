import 'package:flutter/material.dart';

import '../node.dart';

/// An `<nestedScrollView>` — a [NestedScrollView] whose outer header slivers are
/// produced reactively by the JS builder/signal pattern.
///
/// The JS wrapper owns the `innerBoxIsScrolled` signal and renders the header
/// slivers into a single `<nestedScrollHeader>` child node. On every header
/// build Flutter pushes the live `innerBoxIsScrolled` flag to JS via `onHeader`,
/// and the Dart [headerSliverBuilder] returns that header node's `childWidgets`.
/// The body is a node slot (`body`).
///
/// The [SliverOverlapAbsorberHandle] is owned by [NestedScrollView] itself;
/// descendant `<sliverOverlapAbsorber>` / `<sliverOverlapInjector>` resolve it
/// from context (see [overlapHandleOf]) rather than threading it through JS.
class FuseNestedScrollView extends StatelessWidget {
  const FuseNestedScrollView(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final scrollDirection =
        node.string('scrollDirection') == 'horizontal'
            ? Axis.horizontal
            : Axis.vertical;
    final reverse = node.bool('reverse') ?? false;
    final floatHeaderSlivers = node.bool('floatHeaderSlivers') ?? false;
    final controller = node.handle<ScrollController>('controller');

    return NestedScrollView(
      controller: controller,
      scrollDirection: scrollDirection,
      reverse: reverse,
      floatHeaderSlivers: floatHeaderSlivers,
      headerSliverBuilder: (context, innerBoxIsScrolled) {
        node.callback('onHeader')?.call(innerBoxIsScrolled);
        // The JS wrapper renders the header slivers into a single
        // `<nestedScrollHeader>` child; return that child's slivers.
        final header = node.children.isEmpty ? null : node.children.first;
        return header?.childWidgets ?? const <Widget>[];
      },
      body: node.widget('body') ?? const SizedBox(),
    );
  }
}

/// Resolves the [SliverOverlapAbsorberHandle] of the enclosing
/// [NestedScrollView], or null when there is no enclosing [NestedScrollView].
///
/// Used by `<sliverOverlapAbsorber>` / `<sliverOverlapInjector>` so the handle
/// is never threaded through JS. Returns null (rather than throwing) when used
/// standalone, so those widgets can degrade gracefully instead of crashing.
SliverOverlapAbsorberHandle? overlapHandleOf(BuildContext context) {
  try {
    return NestedScrollView.sliverOverlapAbsorberHandleFor(context);
  } catch (_) {
    return null;
  }
}

/// A `<nestedScrollHeader>` — an internal container holding the reactive header
/// slivers of a [FuseNestedScrollView]. It is never built into the tree
/// directly (the parent reads its `childWidgets`); this fallback only renders if
/// the node is ever placed standalone.
class FuseNestedScrollHeader extends StatelessWidget {
  const FuseNestedScrollHeader(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(slivers: node.childWidgets);
  }
}
