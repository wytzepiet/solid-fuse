import 'package:flutter/material.dart';

import '../node.dart';
import '../node_widget.dart';
import '../runtime.dart';

class FuseNavigatorWidget extends StatefulWidget {
  const FuseNavigatorWidget(this.node);

  final FuseNode node;

  @override
  State<FuseNavigatorWidget> createState() => _FuseNavigatorWidgetState();
}

class _FuseNavigatorWidgetState extends State<FuseNavigatorWidget> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _observer = _FuseNavObserver();
  bool _jsInitiatedPop = false;
  FuseRuntime? _runtime;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_runtime != null) return;
    _runtime = FuseRuntimeScope.of(context);
    _runtime!.registerNavCallback(widget.node.id, _handleNavCommand);
    _observer.onDidPop = _onRoutePop;
  }

  void _handleNavCommand(String op) {
    if (op == 'push') {
      final lastChild = widget.node.children.last;
      _navigatorKey.currentState?.push(MaterialPageRoute(
        builder: (_) =>
            FuseNodeWidget(node: lastChild),
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
            FuseNodeWidget(node: lastChild),
      ));
    }
  }

  void _onRoutePop() {
    if (_jsInitiatedPop) {
      _jsInitiatedPop = false;
      return;
    }
    widget.node.function('onPopPage')?.call();
  }

  @override
  Widget build(BuildContext context) {
    final firstChild = widget.node.children.firstOrNull;
    if (firstChild == null) return const SizedBox.shrink();
    return Navigator(
      key: _navigatorKey,
      observers: [_observer],
      onGenerateRoute: (_) => MaterialPageRoute(
        builder: (_) => FuseNodeWidget(node: firstChild),
      ),
    );
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
