import 'package:flutter/material.dart';

import '../fuse_widget.dart';
import '../node_widget.dart';
import '../runtime.dart';

class FuseNavigatorWidget extends StatefulFuseWidget {
  const FuseNavigatorWidget({super.key, required super.node});

  @override
  State<FuseNavigatorWidget> createState() => _FuseNavigatorWidgetState();
}

class _FuseNavigatorWidgetState extends State<FuseNavigatorWidget> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _observer = _FuseNavObserver();
  bool _jsInitiatedPop = false;
  Widget? _cachedNavigator;
  FuseRuntime? _runtime;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_runtime != null) return;
    _runtime = FuseRuntimeScope.of(context);
    _runtime!.registerNavCallback(widget.node.id, _handleNavCommand);
    _observer.onDidPop = _onRoutePop;

    final firstChild = widget.node.children.firstOrNull;
    if (firstChild != null) {
      _cachedNavigator = Navigator(
        key: _navigatorKey,
        observers: [_observer],
        onGenerateRoute: (_) => MaterialPageRoute(
          builder: (_) => FuseNodeWidget(
            key: ValueKey(firstChild.id),
            node: firstChild,
          ),
        ),
      );
    }
  }

  void _handleNavCommand(String op) {
    if (op == 'push') {
      final lastChild = widget.node.children.last;
      _navigatorKey.currentState?.push(MaterialPageRoute(
        builder: (_) =>
            FuseNodeWidget(key: ValueKey(lastChild.id), node: lastChild),
      ));
    } else if (op == 'pop') {
      _jsInitiatedPop = true;
      _navigatorKey.currentState?.pop();
    } else if (op == 'replace') {
      _jsInitiatedPop = true;
      _navigatorKey.currentState?.pop();
      final lastChild = widget.node.children.last;
      _navigatorKey.currentState?.push(MaterialPageRoute(
        builder: (_) =>
            FuseNodeWidget(key: ValueKey(lastChild.id), node: lastChild),
      ));
    }
  }

  void _onRoutePop() {
    if (_jsInitiatedPop) {
      _jsInitiatedPop = false;
      return;
    }
    // System-initiated pop (back button / swipe) — notify JS to sync stack
    widget.node.handler('onPopPage')?.call();
  }

  @override
  Widget build(BuildContext context) {
    return _cachedNavigator ?? const SizedBox.shrink();
  }

  @override
  void dispose() {
    _runtime?.unregisterNavCallback(widget.node.id);
    super.dispose();
  }
}

class _FuseNavObserver extends NavigatorObserver {
  VoidCallback? onDidPop;

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    onDidPop?.call();
  }
}
