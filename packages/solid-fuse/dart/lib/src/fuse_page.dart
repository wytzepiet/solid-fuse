import 'package:flutter/material.dart';

import 'node.dart';

abstract class FusePage {
  FusePage(this.node);

  final FuseNode node;

  /// The page's content widget, reactive to node changes.
  Widget get child => ListenableBuilder(
        listenable: node,
        builder: (_, _) => node.buildChildren(),
      );

  /// Build the [Page] for the navigator.
  Page build();
}
