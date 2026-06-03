import 'package:flutter/material.dart';

import '../node.dart';
import '../node_widget.dart';

/// A lazy [SliverChildBuilderDelegate] over a node's eager [FuseNode.children].
///
/// Children are built on demand (Flutter inflates only the visible window) and
/// keyed by the existing `ValueKey<int>(node.id)` that [FuseNodeWidget] applies,
/// so identity survives reorder/insert. [findChildIndexCallback] resolves a
/// child key back to its current index by node id.
///
/// The three keep-alive flags default to true to match Flutter; pass the
/// node's overrides at the call site (e.g. `node.bool('addRepaintBoundaries')`).
SliverChildBuilderDelegate fuseSliverChildDelegate(
  FuseNode node, {
  bool addAutomaticKeepAlives = true,
  bool addRepaintBoundaries = true,
  bool addSemanticIndexes = true,
}) {
  return SliverChildBuilderDelegate(
    (_, i) => FuseNodeWidget(node: node.children[i]),
    childCount: node.children.length,
    addAutomaticKeepAlives: addAutomaticKeepAlives,
    addRepaintBoundaries: addRepaintBoundaries,
    addSemanticIndexes: addSemanticIndexes,
    findChildIndexCallback: (Key key) {
      if (key is! ValueKey<int>) return null;
      final id = key.value;
      for (var i = 0; i < node.children.length; i++) {
        if (node.children[i].id == id) return i;
      }
      return null;
    },
  );
}

/// A [SliverGridDelegate] derived from a node's grid props.
///
/// If `maxCrossAxisExtent` is present → [SliverGridDelegateWithMaxCrossAxisExtent],
/// otherwise [SliverGridDelegateWithFixedCrossAxisCount] (`crossAxisCount ?? 2`).
SliverGridDelegate fuseGridDelegate(FuseNode node) {
  final mainAxisSpacing = node.double('mainAxisSpacing') ?? 0;
  final crossAxisSpacing = node.double('crossAxisSpacing') ?? 0;
  final childAspectRatio = node.double('childAspectRatio') ?? 1.0;
  final mainAxisExtent = node.double('mainAxisExtent');

  final maxCrossAxisExtent = node.double('maxCrossAxisExtent');
  if (maxCrossAxisExtent != null) {
    return SliverGridDelegateWithMaxCrossAxisExtent(
      maxCrossAxisExtent: maxCrossAxisExtent,
      mainAxisSpacing: mainAxisSpacing,
      crossAxisSpacing: crossAxisSpacing,
      childAspectRatio: childAspectRatio,
      mainAxisExtent: mainAxisExtent,
    );
  }

  return SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: node.int('crossAxisCount') ?? 2,
    mainAxisSpacing: mainAxisSpacing,
    crossAxisSpacing: crossAxisSpacing,
    childAspectRatio: childAspectRatio,
    mainAxisExtent: mainAxisExtent,
  );
}

/// The single inner widget of a sliver wrapper: the node's first child, or null
/// if it has none. Used by single-child sliver wrappers (e.g. `SliverPadding`).
Widget? onlyChild(FuseNode node) =>
    node.children.isEmpty ? null : FuseNodeWidget(node: node.children.first);
