import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'connection.dart';
import 'dev_connection.dart';
import 'quickjs_connection.dart';
import 'node.dart';

/// Signature for a Fuse widget builder.
/// Matches the constructor signature of Fuse widget classes,
/// so you can register with `register('type', MyWidget.new)`.
typedef FuseWidgetBuilder = Widget Function({
  Key? key,
  required FuseNode node,
});

/// Host for the WebSocket dev server.
/// Pass via: --dart-define=FUSE_HOST=192.168.x.x
const _devHost = String.fromEnvironment('FUSE_HOST', defaultValue: 'localhost');

/// Port for the Vite dev server.
/// Pass via: --dart-define=FUSE_PORT=24680
const _devPort = int.fromEnvironment('FUSE_PORT', defaultValue: 24680);

/// The Fuse runtime: manages the JS connection, widget registry, and tree rendering.
class FuseRuntime {
  FuseRuntime._() {
    registry = FuseNodeRegistry(onEvent: handleEvent);
  }

  FuseConnection? _connection;

  final Map<String, FuseWidgetBuilder> _registry = {};
  final Set<String> _noUpdateTypes = {};
  late final FuseNodeRegistry registry;
  final Map<int, void Function(String op)> _navCallbacks = {};

  /// Creates and initializes a FuseRuntime. Connects to the dev server
  /// (debug mode) or loads the QuickJS bundle (release mode).
  ///
  /// Register packages before calling this method so that widgets are
  /// available when the JS tree starts rendering.
  static Future<FuseRuntime> create() async {
    final runtime = FuseRuntime._();
    await runtime._init();
    return runtime;
  }

  /// Register a widget type. Set [updateOnNodeChange] to false for widgets that
  /// manage their own state and should not rebuild when the node notifies listeners.
  void register(String type, FuseWidgetBuilder builder, {bool updateOnNodeChange = true}) {
    _registry[type] = builder;
    if (!updateOnNodeChange) _noUpdateTypes.add(type);
  }

  /// Whether a node type should rebuild when its node changes.
  bool updatesOnNodeChange(String type) => !_noUpdateTypes.contains(type);

  /// Register a nav callback so bridge 'nav' messages reach the widget.
  void registerNavCallback(int nodeId, void Function(String op) callback) {
    _navCallbacks[nodeId] = callback;
  }

  /// Unregister a nav callback.
  void unregisterNavCallback(int nodeId) {
    _navCallbacks.remove(nodeId);
  }

  /// Dispatch a navigation command to the registered navigator widget.
  void handleNavCommand(int navigatorId, String op) {
    _navCallbacks[navigatorId]?.call(op);
  }

  /// Initialize the runtime. In debug mode, tries dev server first (pre-fetches
  /// modules from Vite), then falls back to QuickJS bundle. In release mode,
  /// uses QuickJS bundle directly.
  Future<void> _init() async {
    if (_connection != null && _connection!.isConnected) {
      await _connection!.restart();
      return;
    }

    if (kDebugMode) {
      try {
        final dev = DevServerConnection(host: _devHost, port: _devPort);
        await dev.connect();
        _connection = dev;
        _registerChannels();
        await dev.start();
        debugPrint('[Fuse] Connected to dev server at $_devHost');
        return;
      } catch (e) {
        debugPrint('[Fuse] Dev server not available ($e), falling back to QuickJS bundle');
      }
    }

    final qjs = QuickJsConnection();
    await qjs.connect();
    _connection = qjs;
    _registerChannels();
    await qjs.start();
  }

  /// Register runtime-level channel handlers (ops, nav).
  void _registerChannels() {
    final channels = _connection!.channels!;
    channels.on('_ops', (data) {
      try {
        applyOps(data['ops'] as List<dynamic>);
      } catch (e) {
        debugPrint('[Fuse] ops error: $e');
      }
    });
    channels.on('_nav', (data) {
      handleNavCommand(
        data['navigatorId'] as int,
        data['op'] as String,
      );
    });
  }

  /// No-op: connections are reused across hot restarts, never disposed.
  void dispose() {}

  /// Dispatch an event to the JS side via channels.
  void handleEvent(int nodeId, String event) {
    _connection?.channels?.send('_event', {
      'nodeId': nodeId,
      'event': event,
    });
  }

  /// Apply a batch of ops from the JS side.
  void applyOps(List<dynamic> ops) {
    final dirty = <FuseNode>{};

    for (final op in ops) {
      final map = op is Map<String, dynamic> ? op : Map<String, dynamic>.from(op as Map);
      switch (map['op']) {
        case 'create':
          registry.create(
            map['id'] as int,
            map['type'] as String,
            Map<String, dynamic>.from(map['props'] as Map),
          );
        case 'setText':
          final node = registry.get(map['id'] as int);
          node.setPropSilent('text', map['text']);
          dirty.add(node);
          if (node.parent != null) dirty.add(node.parent!);
        case 'setProp':
          final node = registry.get(map['id'] as int);
          node.setPropSilent(map['name'] as String, map['value']);
          dirty.add(node);
        case 'insert':
          final parent = registry.get(map['parentId'] as int);
          final child = registry.get(map['childId'] as int);
          parent.insertChildSilent(map['index'] as int, child);
          dirty.add(parent);
        case 'remove':
          final parent = registry.get(map['parentId'] as int);
          final child = registry.get(map['childId'] as int);
          parent.removeChildSilent(child);
          dirty.add(parent);
          _removeSubtree(child, dirty);
      }
    }

    for (final node in dirty) {
      node.markDirty();
    }
  }

  /// Recursively remove a node and its descendants from the registry,
  /// disposing their ChangeNotifiers. Also removes them from [dirty] to
  /// prevent notifying disposed nodes.
  void _removeSubtree(FuseNode node, Set<FuseNode> dirty) {
    for (final child in node.children) {
      _removeSubtree(child, dirty);
    }
    dirty.remove(node);
    registry.remove(node.id);
  }

  /// Build a Flutter widget for a single FuseNode.
  Widget buildWidgetForNode(FuseNode node) {
    if (node.type == 'root') {
      final childWidgets = node.childWidgets;
      if (childWidgets.isEmpty) return const SizedBox.shrink();
      if (childWidgets.length == 1) return childWidgets.first;
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: childWidgets,
      );
    }

    if (node.type == '__text__') {
      return Text(node.props['text']?.toString() ?? '');
    }

    final builder = _registry[node.type];
    if (builder == null) {
      if (kDebugMode) {
        return devError(node, 'No builder registered.\n'
            'Call register(\'${node.type}\', ...) before using it.');
      }
      return Text('[unknown: ${node.type}]');
    }

    return builder(node: node);
  }

  Widget devError(FuseNode node, String message) {
    final label = node.component != null
        ? '<${node.type}> #${node.id} in <${node.component}>'
        : '<${node.type}> #${node.id}';
    debugPrint('[Fuse] $label: $message');
    final propsStr = node.props.toString();
    final truncated =
        propsStr.length > 300 ? '${propsStr.substring(0, 300)}…' : propsStr;
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.red, width: 3),
        color: const Color(0xFFFFCDD2),
      ),
      padding: const EdgeInsets.all(8),
      child: SingleChildScrollView(
        child: Text(
          '\u26a0 $label\n\n$message\n\nProps: $truncated',
          style: const TextStyle(
            fontSize: 11,
            fontFamily: 'monospace',
            color: Color(0xFFB71C1C),
          ),
        ),
      ),
    );
  }
}

/// Provides a [FuseRuntime] to the widget tree.
class FuseRuntimeScope extends InheritedWidget {
  const FuseRuntimeScope({
    super.key,
    required this.runtime,
    required super.child,
  });

  final FuseRuntime runtime;

  static FuseRuntime of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<FuseRuntimeScope>();
    assert(scope != null, 'No FuseRuntimeScope found in widget tree');
    return scope!.runtime;
  }

  @override
  bool updateShouldNotify(FuseRuntimeScope oldWidget) =>
      runtime != oldWidget.runtime;
}

/// A widget that renders the Fuse JS tree.
class FuseView extends StatelessWidget {
  const FuseView({super.key, required this.runtime});

  final FuseRuntime runtime;

  @override
  Widget build(BuildContext context) {
    final root = runtime.registry.get(0);
    return FuseRuntimeScope(
      runtime: runtime,
      child: ListenableBuilder(
        listenable: root,
        builder: (context, _) => runtime.buildWidgetForNode(root),
      ),
    );
  }
}
