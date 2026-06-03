import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../node.dart';

class FuseSliverAppBar extends StatelessWidget {
  const FuseSliverAppBar(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final leading = node.widget('leading');
    final title = node.widget('title');
    final flexibleSpace = node.widget('flexibleSpace');
    final actions = node.widgetList('actions');

    // `bottom` must be a PreferredSizeWidget — wrap the slot node in a
    // PreferredSize sized by `bottomHeight` (defaulting to the standard 48).
    final bottomChild = node.widget('bottom');
    final bottom = bottomChild == null
        ? null
        : PreferredSize(
            preferredSize: Size.fromHeight(node.double('bottomHeight') ?? 48),
            child: bottomChild,
          );

    final clipStr = node.string('clipBehavior');
    final clip = clipStr != null ? node.clipBehavior('clipBehavior') : null;

    final systemOverlayStyle = switch (node.string('systemOverlayStyle')) {
      'light' => SystemUiOverlayStyle.light,
      'dark' => SystemUiOverlayStyle.dark,
      _ => null,
    };

    final onStretch = node.asyncCallback('onStretchTrigger');
    final onStretchTrigger = onStretch == null
        ? null
        : () async {
            await onStretch();
          };

    // Shared props across all three constructors. `pinned` defaults differ by
    // variant (small=false, medium/large=true), so resolve it per-branch below.
    final pinned = node.bool('pinned');
    final floating = node.bool('floating') ?? false;
    final snap = node.bool('snap') ?? false;
    final stretch = node.bool('stretch') ?? false;
    final forceElevated = node.bool('forceElevated') ?? false;
    final primary = node.bool('primary') ?? true;
    final centerTitle = node.bool('centerTitle');
    final automaticallyImplyLeading =
        node.bool('automaticallyImplyLeading') ?? true;
    final excludeHeaderSemantics =
        node.bool('excludeHeaderSemantics') ?? false;

    final elevation = node.double('elevation');
    final scrolledUnderElevation = node.double('scrolledUnderElevation');
    final expandedHeight = node.double('expandedHeight');
    final collapsedHeight = node.double('collapsedHeight');
    // Left null for medium/large so their Material 3 collapsed-height defaults
    // apply; the small/default constructor falls back to kToolbarHeight below.
    final toolbarHeight = node.double('toolbarHeight');
    final titleSpacing = node.double('titleSpacing');
    final stretchTriggerOffset = node.double('stretchTriggerOffset') ?? 100.0;
    final leadingWidth = node.double('leadingWidth');

    final backgroundColor = node.color('backgroundColor');
    final foregroundColor = node.color('foregroundColor');
    final shadowColor = node.color('shadowColor');
    final surfaceTintColor = node.color('surfaceTintColor');

    switch (node.string('type')) {
      case 'medium':
        return SliverAppBar.medium(
          leading: leading,
          title: title,
          actions: actions,
          flexibleSpace: flexibleSpace,
          bottom: bottom,
          pinned: pinned ?? true,
          floating: floating,
          snap: snap,
          stretch: stretch,
          forceElevated: forceElevated,
          primary: primary,
          centerTitle: centerTitle,
          automaticallyImplyLeading: automaticallyImplyLeading,
          excludeHeaderSemantics: excludeHeaderSemantics,
          elevation: elevation,
          scrolledUnderElevation: scrolledUnderElevation,
          expandedHeight: expandedHeight,
          collapsedHeight: collapsedHeight,
          // Material 3 medium app bars collapse to 64dp by default.
          toolbarHeight: toolbarHeight ?? 64.0,
          titleSpacing: titleSpacing,
          stretchTriggerOffset: stretchTriggerOffset,
          leadingWidth: leadingWidth,
          backgroundColor: backgroundColor,
          foregroundColor: foregroundColor,
          shadowColor: shadowColor,
          surfaceTintColor: surfaceTintColor,
          systemOverlayStyle: systemOverlayStyle,
          onStretchTrigger: onStretchTrigger,
          clipBehavior: clip,
        );
      case 'large':
        return SliverAppBar.large(
          leading: leading,
          title: title,
          actions: actions,
          flexibleSpace: flexibleSpace,
          bottom: bottom,
          pinned: pinned ?? true,
          floating: floating,
          snap: snap,
          stretch: stretch,
          forceElevated: forceElevated,
          primary: primary,
          centerTitle: centerTitle,
          automaticallyImplyLeading: automaticallyImplyLeading,
          excludeHeaderSemantics: excludeHeaderSemantics,
          elevation: elevation,
          scrolledUnderElevation: scrolledUnderElevation,
          expandedHeight: expandedHeight,
          collapsedHeight: collapsedHeight,
          // Material 3 large app bars collapse to 64dp by default.
          toolbarHeight: toolbarHeight ?? 64.0,
          titleSpacing: titleSpacing,
          stretchTriggerOffset: stretchTriggerOffset,
          leadingWidth: leadingWidth,
          backgroundColor: backgroundColor,
          foregroundColor: foregroundColor,
          shadowColor: shadowColor,
          surfaceTintColor: surfaceTintColor,
          systemOverlayStyle: systemOverlayStyle,
          onStretchTrigger: onStretchTrigger,
          clipBehavior: clip,
        );
      default:
        return SliverAppBar(
          leading: leading,
          title: title,
          actions: actions,
          flexibleSpace: flexibleSpace,
          bottom: bottom,
          pinned: pinned ?? false,
          floating: floating,
          snap: snap,
          stretch: stretch,
          forceElevated: forceElevated,
          primary: primary,
          centerTitle: centerTitle,
          automaticallyImplyLeading: automaticallyImplyLeading,
          excludeHeaderSemantics: excludeHeaderSemantics,
          elevation: elevation,
          scrolledUnderElevation: scrolledUnderElevation,
          expandedHeight: expandedHeight,
          collapsedHeight: collapsedHeight,
          toolbarHeight: toolbarHeight ?? kToolbarHeight,
          titleSpacing: titleSpacing,
          stretchTriggerOffset: stretchTriggerOffset,
          leadingWidth: leadingWidth,
          backgroundColor: backgroundColor,
          foregroundColor: foregroundColor,
          shadowColor: shadowColor,
          surfaceTintColor: surfaceTintColor,
          systemOverlayStyle: systemOverlayStyle,
          onStretchTrigger: onStretchTrigger,
          clipBehavior: clip,
        );
    }
  }
}
