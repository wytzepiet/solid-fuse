import '../../runtime.dart';
import 'cupertino_sliver_navigation_bar.dart';
import 'cupertino_sliver_refresh_control.dart';
import 'custom_scroll_view.dart';
import 'decorated_sliver.dart';
import 'flexible_space_bar.dart';
import 'nested_scroll_view.dart';
import 'pinned_header_sliver.dart';
import 'refresh_indicator.dart';
import 'reorderable_delayed_drag_start_listener.dart';
import 'reorderable_drag_start_listener.dart';
import 'sliver_animated_opacity.dart';
import 'sliver_app_bar.dart';
import 'sliver_constrained_cross_axis.dart';
import 'sliver_cross_axis_expanded.dart';
import 'sliver_cross_axis_group.dart';
import 'sliver_fill_remaining.dart';
import 'sliver_fill_viewport.dart';
import 'sliver_floating_header.dart';
import 'sliver_grid.dart';
import 'sliver_ignore_pointer.dart';
import 'sliver_layout_builder.dart';
import 'sliver_list.dart';
import 'sliver_main_axis_group.dart';
import 'sliver_opacity.dart';
import 'sliver_overlap_absorber.dart';
import 'sliver_overlap_injector.dart';
import 'sliver_padding.dart';
import 'sliver_persistent_header.dart';
import 'sliver_reorderable_list.dart';
import 'sliver_resizing_header.dart';
import 'sliver_safe_area.dart';
import 'sliver_to_box_adapter.dart';

/// Registers all built-in sliver widgets.
///
/// Called from [registerSolidFuse] so the sliver suite stays self-contained
/// rather than bloating the core registration file.
void registerSlivers(FuseRuntime runtime) {
  // Scroll-view hosts.
  runtime.registerWidget('customScrollView', FuseCustomScrollView.new);
  runtime.registerWidget('nestedScrollView', FuseNestedScrollView.new);
  runtime.registerWidget('sliverOverlapAbsorber', FuseSliverOverlapAbsorber.new);
  runtime.registerWidget('sliverOverlapInjector', FuseSliverOverlapInjector.new);

  // Lists & grids.
  runtime.registerWidget('sliverList', FuseSliverList.new);
  runtime.registerWidget('sliverGrid', FuseSliverGrid.new);

  // Headers & app bars.
  runtime.registerWidget('sliverAppBar', FuseSliverAppBar.new);
  runtime.registerWidget('flexibleSpaceBar', FuseFlexibleSpaceBar.new);
  runtime.registerWidget('sliverPersistentHeader', FuseSliverPersistentHeader.new);
  runtime.registerWidget('pinnedHeaderSliver', FusePinnedHeaderSliver.new);
  runtime.registerWidget('sliverResizingHeader', FuseSliverResizingHeader.new);
  runtime.registerWidget('sliverFloatingHeader', FuseSliverFloatingHeader.new);

  // Layout, sizing & grouping.
  runtime.registerWidget('sliverToBoxAdapter', FuseSliverToBoxAdapter.new);
  runtime.registerWidget('sliverPadding', FuseSliverPadding.new);
  runtime.registerWidget('sliverFillRemaining', FuseSliverFillRemaining.new);
  runtime.registerWidget('sliverFillViewport', FuseSliverFillViewport.new);
  runtime.registerWidget('sliverMainAxisGroup', FuseSliverMainAxisGroup.new);
  runtime.registerWidget('sliverCrossAxisGroup', FuseSliverCrossAxisGroup.new);
  runtime.registerWidget('sliverConstrainedCrossAxis', FuseSliverConstrainedCrossAxis.new);
  runtime.registerWidget('sliverCrossAxisExpanded', FuseSliverCrossAxisExpanded.new);
  runtime.registerWidget('sliverLayoutBuilder', FuseSliverLayoutBuilder.new);

  // Decoration & effects.
  runtime.registerWidget('decoratedSliver', FuseDecoratedSliver.new);
  runtime.registerWidget('sliverOpacity', FuseSliverOpacity.new);
  runtime.registerWidget('sliverAnimatedOpacity', FuseSliverAnimatedOpacity.new);
  runtime.registerWidget('sliverIgnorePointer', FuseSliverIgnorePointer.new);
  runtime.registerWidget('sliverSafeArea', FuseSliverSafeArea.new);

  // Interactive & pull-to-refresh.
  runtime.registerWidget('sliverReorderableList', FuseSliverReorderableList.new);
  runtime.registerWidget(
    'reorderableDragStartListener',
    FuseReorderableDragStartListener.new,
  );
  runtime.registerWidget(
    'reorderableDelayedDragStartListener',
    FuseReorderableDelayedDragStartListener.new,
  );
  runtime.registerWidget(
    'cupertinoSliverRefreshControl',
    FuseCupertinoSliverRefreshControl.new,
  );
  runtime.registerWidget('refreshIndicator', FuseRefreshIndicator.new);
  runtime.registerWidget(
    'cupertinoSliverNavigationBar',
    FuseCupertinoSliverNavigationBar.new,
  );
}
