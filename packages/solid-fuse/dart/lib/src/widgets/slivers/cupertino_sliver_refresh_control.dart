import 'package:flutter/cupertino.dart';

import '../../node.dart';

class FuseCupertinoSliverRefreshControl extends StatelessWidget {
  const FuseCupertinoSliverRefreshControl(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final onRefresh = node.asyncCallback('onRefresh');

    return CupertinoSliverRefreshControl(
      refreshTriggerPullDistance:
          node.double('refreshTriggerPullDistance') ?? 100,
      refreshIndicatorExtent: node.double('refreshIndicatorExtent') ?? 60,
      onRefresh: onRefresh == null
          ? null
          : () async {
              await onRefresh();
            },
    );
  }
}
