import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'node.dart';
import 'runtime.dart';

abstract class FuseWidget extends StatelessWidget {
  const FuseWidget({super.key, required this.node});

  final FuseNode node;

  @override
  StatelessElement createElement() => kDebugMode
      ? _FuseErrorElement(this)
      : super.createElement();

  /// Lays out children according to the `flex` prop group.
  /// Returns the single child directly when no layout props are needed.
  Widget buildChildren() {
    final flex = node.map('flex');

    final direction = flex?.string('direction');
    final isHorizontal = direction == 'horizontal';
    final gap = flex?.double('gap') ?? 0;
    final align = flex?.string('align');
    final justify = flex?.string('justify');

    final crossAxis = switch (align) {
      'center' => CrossAxisAlignment.center,
      'end' => CrossAxisAlignment.end,
      'stretch' => CrossAxisAlignment.stretch,
      _ => CrossAxisAlignment.start,
    };

    final mainAxis = switch (justify) {
      'center' => MainAxisAlignment.center,
      'end' => MainAxisAlignment.end,
      'spaceBetween' => MainAxisAlignment.spaceBetween,
      'spaceAround' => MainAxisAlignment.spaceAround,
      'spaceEvenly' => MainAxisAlignment.spaceEvenly,
      _ => MainAxisAlignment.start,
    };

    final mainAxisSize = (justify != null && justify != 'start')
        ? MainAxisSize.max
        : MainAxisSize.min;

    final c = node.childWidgets;
    if (c.length == 1 &&
        gap == 0 &&
        mainAxis == MainAxisAlignment.start &&
        crossAxis == CrossAxisAlignment.start) {
      return c.first;
    }
    return Flex(
      direction: isHorizontal ? Axis.horizontal : Axis.vertical,
      mainAxisSize: mainAxisSize,
      mainAxisAlignment: mainAxis,
      crossAxisAlignment: crossAxis,
      spacing: gap,
      children: c,
    );
  }
}

abstract class StatefulFuseWidget extends StatefulWidget {
  const StatefulFuseWidget({super.key, required this.node});

  final FuseNode node;
}

class _FuseErrorElement extends StatelessElement {
  _FuseErrorElement(FuseWidget super.widget);

  @override
  Widget build() {
    try {
      return super.build();
    } catch (e, stack) {
      final fuseWidget = widget as FuseWidget;
      final relevantFrames = stack.toString().split('\n')
          .where((l) => l.contains('package:solid_fuse/') || l.contains('package:fuse'))
          .join('\n');
      debugPrint('[Fuse] $e\n$relevantFrames');
      return FuseRuntimeScope.of(this).devError(fuseWidget.node, e.toString());
    }
  }
}
