import 'package:flutter/widgets.dart';

import '../node.dart';
import '../runtime.dart';

/// `<modal type="..." open>`: a route (dialog, sheet, popup) shown while
/// `open` is true. The route is made by the factory registered for `type`
/// ([FuseRuntime.registerRoute]) and shows the node's children. When the
/// route goes away on its own (barrier tap, back button, a drag), JS hears
/// `onOpenChange(false)`. It reports the route's life as `onRouteLive`
/// (true once pushed, false once fully gone), so JS holds the content just
/// that long. Registered `inFlow: false`: no part in the parent's layout.
class FuseModal extends StatefulWidget {
  const FuseModal(this.node, {super.key});

  final FuseNode node;

  @override
  State<FuseModal> createState() => _FuseModalState();
}

class _FuseModalState extends State<FuseModal> {
  Route<Object?>? _route;

  FuseNode get node => widget.node;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  @override
  void didUpdateWidget(covariant FuseModal oldWidget) {
    super.didUpdateWidget(oldWidget);
    _schedule();
  }

  // Pushing and popping touch the Navigator, which can't change while this
  // widget builds.
  void _schedule() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _sync();
      });

  void _sync() {
    final open = node.bool('open') ?? false;
    if (open && _route == null) {
      _push();
    } else if (!open && _route != null) {
      _close();
    }
  }

  void _push() {
    final runtime = FuseRuntimeScope.of(context);
    final type = node.string('type') ?? 'dialog';
    final factory = runtime.routeFactory(type);
    if (factory == null) {
      debugPrint('[Fuse modal] no route type "$type": did a package forget runtime.registerRoute?');
      return;
    }
    // The route lives in the Navigator's overlay, outside this subtree.
    Widget content(BuildContext _) => FuseRuntimeScope(
          runtime: runtime,
          child: ListenableBuilder(listenable: node, builder: (_, _) => node.flexChildren),
        );
    final route = factory(context, node, content);
    _route = route;
    final navigator = Navigator.of(context, rootNavigator: node.bool('useRootNavigator') ?? true);
    node.callback('onRouteLive')?.call(true);
    navigator.push(route).whenComplete(() {
      if (identical(_route, route)) {
        _route = null;
        // Gone without JS asking: tell it.
        if (mounted && (node.bool('open') ?? false)) {
          node.callback('onOpenChange')?.call(false);
        }
      }
    });
    // JS keeps the content until the route is fully gone, so the closing
    // animation still shows it.
    final gone = route is TransitionRoute<Object?> ? route.completed : route.popped;
    gone.whenComplete(() {
      if (mounted && _route == null) node.callback('onRouteLive')?.call(false);
    });
  }

  void _close() {
    final route = _route!;
    _route = null;
    final navigator = route.navigator;
    if (navigator == null) return;
    if (route.isCurrent) {
      navigator.pop();
    } else if (route.isActive) {
      navigator.removeRoute(route);
    }
  }

  @override
  void dispose() {
    final route = _route;
    _route = null;
    if (route != null && route.isActive) {
      final navigator = route.navigator;
      // The widget is going: take its route along, after this frame.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!route.isActive) return;
        if (route.isCurrent) {
          navigator?.pop();
        } else {
          navigator?.removeRoute(route);
        }
      });
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

/// Core's `dialog` route: content centred over a dimmed barrier, faded and
/// scaled in. No surface of its own: the content brings its look.
Route<Object?> fuseDialogRoute(BuildContext context, FuseNode node, WidgetBuilder content) {
  final duration = Duration(milliseconds: node.int('duration') ?? 200);
  return RawDialogRoute<Object?>(
    barrierDismissible: node.bool('dismissible') ?? true,
    barrierColor: node.color('barrierColor') ?? const Color(0x80000000),
    barrierLabel: node.string('barrierLabel') ?? 'Dismiss',
    transitionDuration: duration,
    pageBuilder: (context, _, _) => SafeArea(
      child: Align(alignment: node.alignment('alignment') ?? Alignment.center, child: content(context)),
    ),
    transitionBuilder: (context, animation, _, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(scale: Tween(begin: 0.96, end: 1.0).animate(curved), child: child),
      );
    },
  );
}
