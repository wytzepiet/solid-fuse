import 'package:flutter/material.dart';

import '../node.dart';

class FuseViewWidget extends StatelessWidget {
  const FuseViewWidget(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    // ── Read all props ──────────────────────────────────────────────────────

    // Spacing
    final padding = node.edgeInsets('padding');
    final margin = node.edgeInsets('margin');

    // Sizing
    final width = node.double('width');
    final height = node.double('height');
    final minWidth = node.double('minWidth');
    final maxWidth = node.double('maxWidth');
    final minHeight = node.double('minHeight');
    final maxHeight = node.double('maxHeight');
    final aspectRatio = node.double('aspectRatio');

    // Alignment
    final alignment = node.alignment('alignment');

    // Decoration
    final decoration = node.boxDecoration('decoration');
    final foregroundDecoration = node.boxDecoration('foregroundDecoration');

    // Flex child
    final grow = node.int('grow');
    final fit = node.string('fit');

    // Transform
    final transform = node.map('transform');

    // Clip
    final clipBehavior = node.string('clipBehavior');

    // Visibility & interaction
    final opacity = node.double('opacity');
    final visible = node.bool('visible') ?? true;
    final ignorePointer = node.bool('ignorePointer') ?? false;

    // ── Layer 1: Flex or single child ──────────────────────────────────────

    Widget result = node.flexChildren;

    // ── Layer 2: Padding ─────────────────────────────────────────────────────

    if (padding != null) {
      result = Padding(padding: padding, child: result);
    }

    // ── Layer 3: Alignment ──────────────────────────────────────────────────

    if (alignment != null) {
      result = Align(alignment: alignment, child: result);
    }

    // ── Layer 4: Clip ────────────────────────────────────────────────────────

    if (clipBehavior != null && clipBehavior != 'none') {
      final clip = node.clipBehavior('clipBehavior');
      final borderRadius = decoration?.borderRadius;
      if (borderRadius != null) {
        result = ClipRRect(
          borderRadius: borderRadius as BorderRadius,
          clipBehavior: clip,
          child: result,
        );
      } else {
        result = ClipRect(clipBehavior: clip, child: result);
      }
    }

    // ── Layer 4: Decoration ──────────────────────────────────────────────────

    if (decoration != null) {
      result = DecoratedBox(decoration: decoration, child: result);
    }

    if (foregroundDecoration != null) {
      result = DecoratedBox(
        position: DecorationPosition.foreground,
        decoration: foregroundDecoration,
        child: result,
      );
    }

    // ── Layer 5: AspectRatio ─────────────────────────────────────────────────

    if (aspectRatio != null) {
      result = AspectRatio(aspectRatio: aspectRatio, child: result);
    }

    // ── Layer 6: SizedBox / ConstrainedBox ───────────────────────────────────

    final hasConstraints =
        minWidth != null ||
        maxWidth != null ||
        minHeight != null ||
        maxHeight != null;

    if (width != null || height != null) {
      result = SizedBox(width: width, height: height, child: result);
    }

    if (hasConstraints) {
      result = ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: minWidth ?? 0,
          maxWidth: maxWidth ?? double.infinity,
          minHeight: minHeight ?? 0,
          maxHeight: maxHeight ?? double.infinity,
        ),
        child: result,
      );
    }

    // ── Layer 7: Opacity ─────────────────────────────────────────────────────

    if (opacity != null) {
      result = Opacity(opacity: opacity.clamp(0.0, 1.0), child: result);
    }

    // ── Layer 8: Transform ───────────────────────────────────────────────────

    if (transform != null) {
      final rotate = transform.double('rotate');
      final scale = transform.double('scale');
      final translateX = transform.double('translateX');
      final translateY = transform.double('translateY');

      if (rotate != null) {
        result = Transform.rotate(angle: rotate, child: result);
      }
      if (scale != null) {
        result = Transform.scale(scale: scale, child: result);
      }
      if (translateX != null || translateY != null) {
        result = Transform.translate(
          offset: Offset(translateX ?? 0, translateY ?? 0),
          child: result,
        );
      }
    }

    // ── Layer 9: Margin ──────────────────────────────────────────────────────

    if (margin != null) {
      result = Padding(padding: margin, child: result);
    }

    // ── Layer 10: IgnorePointer ──────────────────────────────────────────────

    if (ignorePointer) {
      result = IgnorePointer(child: result);
    }

    // ── Layer 11: Visibility ─────────────────────────────────────────────────

    if (!visible) {
      result = Visibility(visible: false, child: result);
    }

    // ── Layer 12: Flexible (outermost) ───────────────────────────────────────

    if (grow != null && grow > 0) {
      final flexFit = fit == 'tight' ? FlexFit.tight : FlexFit.loose;
      result = Flexible(flex: grow, fit: flexFit, child: result);
    }

    return result;
  }
}
