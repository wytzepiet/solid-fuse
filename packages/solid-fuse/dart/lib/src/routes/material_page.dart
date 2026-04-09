import 'package:flutter/material.dart';

import '../fuse_page.dart';

class FuseMaterialPage extends FusePage {
  FuseMaterialPage(super.node);

  @override
  Page build() => MaterialPage(
        key: ValueKey(node.id),
        fullscreenDialog: node.bool('fullscreenDialog') ?? false,
        maintainState: node.bool('maintainState') ?? true,
        child: child,
      );
}
