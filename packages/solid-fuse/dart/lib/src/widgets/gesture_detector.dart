import 'package:flutter/material.dart';

import '../fuse_widget.dart';

class FuseGestureDetector extends FuseWidget {
  const FuseGestureDetector({super.key, required super.node});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: node.function('onTap'),
      onDoubleTap: node.function('onDoubleTap'),
      onLongPress: node.function('onLongPress'),
      child: buildChildren(),
    );
  }
}
