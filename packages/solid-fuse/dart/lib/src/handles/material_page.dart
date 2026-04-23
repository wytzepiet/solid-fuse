import 'package:flutter/material.dart';

import '../fuse_page_handle.dart';

/// Handle for a `<materialPage>` — yields a [MaterialPage] that Flutter's
/// declarative Navigator consumes. The page's visible content comes from
/// the node's JSX children, wrapped in [Material] so ink effects, text
/// styling, etc. work out of the box.
class FuseMaterialPage extends FusePageHandle {
  FuseMaterialPage(super.node);

  @override
  late final Page<dynamic> object = MaterialPage<dynamic>(
    key: pageKey,
    name: node.string('name'),
    fullscreenDialog: node.bool('fullscreenDialog') ?? false,
    maintainState: node.bool('maintainState') ?? true,
    child: Material(child: pageContent),
  );
}
