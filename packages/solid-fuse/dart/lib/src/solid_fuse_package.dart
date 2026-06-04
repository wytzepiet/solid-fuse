import 'handles/focus_node.dart';
import 'handles/material_page.dart';
import 'handles/scroll_controller.dart';
import 'runtime.dart';
import 'widgets/cupertino_sliver_navigation_bar.dart';
import 'widgets/cupertino_sliver_refresh_control.dart';
import 'widgets/custom_scroll_view.dart';
import 'widgets/decorated_sliver.dart';
import 'widgets/flexible_space_bar.dart';
import 'widgets/gesture_detector.dart';
import 'widgets/icon.dart';
import 'widgets/image.dart';
import 'widgets/navigator.dart';
import 'widgets/nested_scroll_view.dart';
import 'widgets/pinned_header_sliver.dart';
import 'widgets/positioned.dart';
import 'widgets/refresh_indicator.dart';
import 'widgets/reorderable_delayed_drag_start_listener.dart';
import 'widgets/reorderable_drag_start_listener.dart';
import 'widgets/scroll_view.dart';
import 'widgets/sliver_animated_opacity.dart';
import 'widgets/sliver_app_bar.dart';
import 'widgets/sliver_constrained_cross_axis.dart';
import 'widgets/sliver_cross_axis_expanded.dart';
import 'widgets/sliver_cross_axis_group.dart';
import 'widgets/sliver_fill_remaining.dart';
import 'widgets/sliver_fill_viewport.dart';
import 'widgets/sliver_floating_header.dart';
import 'widgets/sliver_grid.dart';
import 'widgets/sliver_ignore_pointer.dart';
import 'widgets/sliver_layout_builder.dart';
import 'widgets/sliver_list.dart';
import 'widgets/sliver_main_axis_group.dart';
import 'widgets/sliver_opacity.dart';
import 'widgets/sliver_overlap_absorber.dart';
import 'widgets/sliver_overlap_injector.dart';
import 'widgets/sliver_padding.dart';
import 'widgets/sliver_persistent_header.dart';
import 'widgets/sliver_reorderable_list.dart';
import 'widgets/sliver_resizing_header.dart';
import 'widgets/sliver_safe_area.dart';
import 'widgets/sliver_to_box_adapter.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/text_field.dart';
import 'widgets/view.dart';

/// Registers all built-in Fuse widgets and handles.
///
/// solid-fuse is the core package — `fuse link` sorts it first so its
/// registrations land before any third-party package's.
void registerSolidFuse(FuseRuntime runtime) {
  runtime.registerWidget('view', FuseViewWidget.new);
  runtime.registerWidget('text', FuseText.new);
  runtime.registerWidget('icon', FuseIcon.new);
  runtime.registerWidget('image', FuseImage.new);
  runtime.registerWidget('gestureDetector', FuseGestureDetector.new);
  runtime.registerWidget('navigator', FuseNavigatorWidget.new);
  runtime.registerWidget('scrollView', FuseScrollView.new);
  runtime.registerWidget('stack', FuseStack.new);
  runtime.registerWidget('positioned', FusePositioned.new);
  runtime.registerWidget('textField', FuseTextField.new);

  // Slivers — scroll-view hosts.
  runtime.registerWidget('customScrollView', FuseCustomScrollView.new);
  runtime.registerWidget('nestedScrollView', FuseNestedScrollView.new);
  runtime.registerWidget('sliverOverlapAbsorber', FuseSliverOverlapAbsorber.new);
  runtime.registerWidget('sliverOverlapInjector', FuseSliverOverlapInjector.new);

  // Slivers — lists & grids.
  runtime.registerWidget('sliverList', FuseSliverList.new);
  runtime.registerWidget('sliverGrid', FuseSliverGrid.new);

  // Slivers — headers & app bars.
  runtime.registerWidget('sliverAppBar', FuseSliverAppBar.new);
  runtime.registerWidget('flexibleSpaceBar', FuseFlexibleSpaceBar.new);
  runtime.registerWidget('sliverPersistentHeader', FuseSliverPersistentHeader.new);
  runtime.registerWidget('pinnedHeaderSliver', FusePinnedHeaderSliver.new);
  runtime.registerWidget('sliverResizingHeader', FuseSliverResizingHeader.new);
  runtime.registerWidget('sliverFloatingHeader', FuseSliverFloatingHeader.new);

  // Slivers — layout, sizing & grouping.
  runtime.registerWidget('sliverToBoxAdapter', FuseSliverToBoxAdapter.new);
  runtime.registerWidget('sliverPadding', FuseSliverPadding.new);
  runtime.registerWidget('sliverFillRemaining', FuseSliverFillRemaining.new);
  runtime.registerWidget('sliverFillViewport', FuseSliverFillViewport.new);
  runtime.registerWidget('sliverMainAxisGroup', FuseSliverMainAxisGroup.new);
  runtime.registerWidget('sliverCrossAxisGroup', FuseSliverCrossAxisGroup.new);
  runtime.registerWidget('sliverConstrainedCrossAxis', FuseSliverConstrainedCrossAxis.new);
  runtime.registerWidget('sliverCrossAxisExpanded', FuseSliverCrossAxisExpanded.new);
  runtime.registerWidget('sliverLayoutBuilder', FuseSliverLayoutBuilder.new);

  // Slivers — decoration & effects.
  runtime.registerWidget('decoratedSliver', FuseDecoratedSliver.new);
  runtime.registerWidget('sliverOpacity', FuseSliverOpacity.new);
  runtime.registerWidget('sliverAnimatedOpacity', FuseSliverAnimatedOpacity.new);
  runtime.registerWidget('sliverIgnorePointer', FuseSliverIgnorePointer.new);
  runtime.registerWidget('sliverSafeArea', FuseSliverSafeArea.new);

  // Slivers — interactive & pull-to-refresh.
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

  runtime.registerHandle('scrollController', FuseScrollController.new);
  runtime.registerHandle('focusNode', FuseFocusNode.new);
  runtime.registerHandle('materialPage', FuseMaterialPage.new);
}
