import 'package:flutter/material.dart';

import '../node.dart';

class FuseIcon extends StatelessWidget {
  const FuseIcon(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final data = node.map('data');
    final codePoint = data?.int('codePoint');
    if (codePoint == null) return const SizedBox.shrink();

    return Icon(
      IconData(
        codePoint,
        fontFamily: data?.string('fontFamily') ?? 'MaterialIcons',
        fontPackage: data?.string('fontPackage'),
        matchTextDirection: data?.bool('matchTextDirection') ?? false,
        fontFamilyFallback: data?.list<String>('fontFamilyFallback'),
      ),
      color: node.color('color'),
      size: node.double('size'),
      semanticLabel: node.string('semanticLabel'),
      fill: node.double('fill'),
      weight: node.double('weight'),
      grade: node.double('grade'),
      opticalSize: node.double('opticalSize'),
      fontWeight: node.fontWeight('fontWeight'),
      applyTextScaling: node.bool('applyTextScaling'),
      shadows: node.boxShadows('shadows')?.cast<Shadow>(),
      blendMode: node.blendMode('blendMode'),
    );
  }
}
