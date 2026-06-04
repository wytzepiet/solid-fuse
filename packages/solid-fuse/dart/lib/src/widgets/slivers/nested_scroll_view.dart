import 'package:flutter/material.dart';

import '../../node.dart';

/// An `<nestedScrollView>` — a [NestedScrollView] whose outer header slivers are
/// produced reactively by the JS builder/signal pattern.
///
/// The JS wrapper owns the `innerBoxIsScrolled` signal and renders the header
/// slivers as the **direct children** of this node (a reactive function child:
/// `{() => props.header(innerBoxIsScrolled())}`). On every header build Flutter
/// pushes the live `innerBoxIsScrolled` flag to JS via `onHeader`, and the Dart
/// [headerSliverBuilder] returns this node's [FuseNode.childWidgets] directly —
/// each a [FuseNodeWidget], so per-sliver prop changes stay granular.
///
/// Because the header slivers are this node's own children, a *structural*
/// change to the header (adding/removing a top-level sliver) marks this node
/// dirty, which rebuilds [FuseNestedScrollView] → a fresh [NestedScrollView]
/// whose `build` re-invokes [headerSliverBuilder] with the new child set. No
/// scroll is needed to pick up the new structure. (The old design extracted
/// `childWidgets` from an unmounted `<nestedScrollHeader>` node, so structural
/// changes only surfaced on the next scroll-driven header build.)
///
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

    // Tracks the last `innerBoxIsScrolled` pushed to JS so we only fire the
    // `onHeader` callback when it actually changes. `headerSliverBuilder` runs
    // many times per scroll; without this guard every run would send a bridge
    // message even though the JS signal value-equality would no-op it. This
    // guard is also load-bearing for loop-safety: if the header builder adds or
    // removes a sliver in response to `innerBoxIsScrolled`, the resulting
    // structural change rebuilds this widget and re-runs `headerSliverBuilder`;
    // suppressing the unchanged re-push stops that from re-triggering JS.
    bool? lastInnerBoxIsScrolled;

    return NestedScrollView(
      controller: controller,
      scrollDirection: scrollDirection,
      reverse: reverse,
      floatHeaderSlivers: floatHeaderSlivers,
      headerSliverBuilder: (context, innerBoxIsScrolled) {
        if (innerBoxIsScrolled != lastInnerBoxIsScrolled) {
          lastInnerBoxIsScrolled = innerBoxIsScrolled;
          node.callback('onHeader')?.call(innerBoxIsScrolled);
        }
        // The header slivers are this node's direct children, rendered
        // reactively by the JS wrapper. Each is a FuseNodeWidget, so prop
        // changes stay granular; a count change dirties this node and rebuilds
        // the NestedScrollView, re-running this builder with the new set.
        return node.childWidgets;
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
