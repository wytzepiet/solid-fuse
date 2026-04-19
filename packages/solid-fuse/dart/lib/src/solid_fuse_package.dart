import 'controllers/focus_node.dart';
import 'controllers/scroll_controller.dart';
import 'routes/material_page.dart';
import 'runtime.dart';
import 'widgets/gesture_detector.dart';
import 'widgets/icon.dart';
import 'widgets/navigator.dart';
import 'widgets/positioned.dart';
import 'widgets/scroll_view.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/text_field.dart';
import 'widgets/view.dart';

/// Registers all built-in Fuse widgets, controllers, and pages.
///
/// solid-fuse is the core package — `fuse link` sorts it first so its
/// registrations land before any third-party package's.
void registerSolidFuse(FuseRuntime runtime) {
  runtime.registerWidget('view', FuseViewWidget.new);
  runtime.registerWidget('text', FuseText.new);
  runtime.registerWidget('icon', FuseIcon.new);
  runtime.registerWidget('gestureDetector', FuseGestureDetector.new);
  runtime.registerWidget('navigator', FuseNavigatorWidget.new);
  runtime.registerWidget('scrollView', FuseScrollView.new);
  runtime.registerWidget('stack', FuseStack.new);
  runtime.registerWidget('positioned', FusePositioned.new);
  runtime.registerWidget('textField', FuseTextField.new);
  runtime.registerController('scrollController', FuseScrollController.new);
  runtime.registerController('focusNode', FuseFocusNode.new);
  runtime.registerPage('materialPage', FuseMaterialPage.new);
}
