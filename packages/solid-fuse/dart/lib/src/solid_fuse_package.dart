import 'handles/focus_node.dart';
import 'handles/material_page.dart';
import 'handles/scroll_controller.dart';
import 'runtime.dart';
import 'widgets/gesture_detector.dart';
import 'widgets/icon.dart';
import 'widgets/image.dart';
import 'widgets/navigator.dart';
import 'widgets/positioned.dart';
import 'widgets/rich_text.dart';
import 'widgets/scroll_view.dart';
import 'widgets/slivers/slivers.dart';
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
  // `text` becomes Text.rich when it has span/widget children (handled inside
  // FuseText). `textSpan` is a marker that builder interprets, not a standalone
  // widget — register it so an orphaned one fails loudly rather than silently.
  runtime.registerWidget('textSpan', FuseTextSpanMarker.new);
  runtime.registerWidget('icon', FuseIcon.new);
  runtime.registerWidget('image', FuseImage.new);
  runtime.registerWidget('gestureDetector', FuseGestureDetector.new);
  runtime.registerWidget('navigator', FuseNavigatorWidget.new);
  runtime.registerWidget('scrollView', FuseScrollView.new);
  runtime.registerWidget('stack', FuseStack.new);
  runtime.registerWidget('positioned', FusePositioned.new);
  runtime.registerWidget('textField', FuseTextField.new);

  registerSlivers(runtime);

  runtime.registerHandle('scrollController', FuseScrollController.new);
  runtime.registerHandle('focusNode', FuseFocusNode.new);
  runtime.registerHandle('materialPage', FuseMaterialPage.new);
}
