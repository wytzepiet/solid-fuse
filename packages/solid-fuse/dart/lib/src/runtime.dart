import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'connection.dart';
import 'dev_connection.dart';
import 'fuse_handle.dart';
import 'node.dart';
import 'quickjs_connection.dart';

/// Signature for a Fuse widget builder.
/// Matches the constructor signature of Fuse widget classes,
/// so you can register with `register('type', MyWidget.new)`.
typedef FuseWidgetBuilder = Widget Function(FuseNode node);

/// Host for the WebSocket dev server.
/// Pass via: --dart-define=FUSE_HOST=192.168.x.x
const _devHost = String.fromEnvironment('FUSE_HOST', defaultValue: 'localhost');

/// Port for the Vite dev server.
/// Pass via: --dart-define=FUSE_PORT=24680
const _devPort = int.fromEnvironment('FUSE_PORT', defaultValue: 24680);

/// The Fuse runtime: manages the JS connection, widget/handle registries,
/// and tree rendering.
class FuseRuntime {
  FuseRuntime._() {
    registry = FuseNodeRegistry(callFunction: callFunction);
    // Pre-create root node so it exists before JS sends ops.
    registry.create(0, 'root', {'_id': 0});
  }

  FuseConnection? _connection;

  final Map<String, FuseWidgetBuilder> _widgetBuilders = {};
  final Map<String, FuseHandle Function(FuseNode node)> _handleFactories = {};
  late final FuseNodeRegistry registry;

  /// Construct a runtime. Does FFI init only — does NOT start the JS engine.
  ///
  /// Call [registerWidget] / [registerHandle] and any workspace-package
  /// `register()` functions BEFORE calling [start]. Once the JS bundle
  /// starts evaluating, it will push create ops that require those factories
  /// to already be in place.
  static Future<FuseRuntime> create() async {
    await LibFjs.init();
    return FuseRuntime._();
  }

  /// Register a widget type — maps a node type to a Flutter Widget builder.
  void registerWidget(String type, FuseWidgetBuilder builder) {
    _widgetBuilders[type] = builder;
  }

  /// Register a handle type — maps a node type to a [FuseHandle] factory.
  /// Used for non-widget nodes: focus nodes, scroll controllers, pages,
  /// navigator, any persistent Dart object that backs a JS-side handle.
  void registerHandle(String type, FuseHandle Function(FuseNode node) factory) {
    _handleFactories[type] = factory;
  }

  /// Start the JS engine. In debug mode, connects to the Vite dev server
  /// (pre-fetches modules from Vite) and falls back to the QuickJS bundle
  /// if unavailable. In release mode, loads the QuickJS bundle directly.
  ///
  /// All widget/handle factories must be registered before this is called —
  /// once the JS bundle starts evaluating, it will push create ops that
  /// require those factories to already be in place.
  ///
  /// Throws if called twice on the same instance.
  Future<void> start() async {
    if (_connection != null) {
      throw StateError('FuseRuntime.start() already called');
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
        debugPrint(
          '[Fuse] Dev server not available ($e), falling back to QuickJS bundle',
        );
      }
    }

    final qjs = QuickJsConnection();
    await qjs.connect();
    _connection = qjs;
    _registerChannels();
    await qjs.start();
  }

  /// Register runtime-level channel handlers.
  void _registerChannels() {
    final channels = _connection!.channels!;
    channels.on('_ops', (data) {
      try {
        final opsList = data['ops'] as List<dynamic>;
        applyOps(opsList);
      } catch (e, st) {
        debugPrint('[Fuse] ops error: $e\n$st');
      }
    });
    channels.on('_handleCall', (data) async {
      final id = data['node'] as int;
      final method = data['method'] as String;
      final value = data['value'];
      final node = registry.tryGet(id);
      if (node == null) throw const HandleDisposedError();
      final handle = node.ownHandle;
      if (handle == null) {
        throw StateError(
          'Node <${node.type}> #$id has no handle — '
          'did you forget to call runtime.registerHandle(\'${node.type}\', ...)?',
        );
      }
      return await handle.call(method, value);
    });
  }

  /// No-op: connections are reused across hot restarts, never disposed.
  void dispose() {}

  /// Call a JS function via the bridge.
  void callFunction(int nodeId, String name, [dynamic value]) {
    _connection?.channels?.send('_functionCall', {
      'nodeId': nodeId,
      'name': name,
      'value': ?value,
    });
  }

  /// Apply a batch of ops from the JS side.
  void applyOps(List<dynamic> ops) {
    final dirty = <FuseNode>{};

    for (final op in ops) {
      final map = op is Map<String, dynamic>
          ? op
          : Map<String, dynamic>.from(op as Map);
      switch (map['op']) {
        case 'create':
          final type = map['type'] as String;
          final node = registry.create(
            map['id'] as int,
            type,
            Map<String, dynamic>.from(map['props'] as Map),
          );
          final factory = _handleFactories[type];
          if (factory != null) {
            node.ownHandle = factory(node);
          }
        case 'setText':
          final node = registry.get(map['id'] as int);
          node.setPropSilent('text', map['text']);
          dirty.add(node);
          if (node.parent != null) dirty.add(node.parent!);
        case 'setProp':
          final node = registry.get(map['id'] as int);
          final name = map['name'] as String;
          var value = map['value'];
          if (value is Map && value.containsKey('_node')) {
            final target = registry.get(value['_node'] as int);
            final prev = node.props[name];
            if (prev is FuseNode && prev.id != target.id) {
              _removeSubtree(prev, dirty);
            }
            value = target;
          }
          node.setPropSilent(name, value);
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
        case 'dispose':
          final node = registry.tryGet(map['id'] as int);
          if (node != null) _removeSubtree(node, dirty);
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
    for (final v in node.props.values) {
      if (v is FuseNode) _removeSubtree(v, dirty);
    }
    dirty.remove(node);
    registry.remove(node.id);
  }

  /// Build a Flutter widget for a single FuseNode.
  Widget buildWidgetForNode(FuseNode node) {
    if (node.type == 'root') return node.flexChildren;

    if (node.type == '__text__') {
      return Text(node.props['text']?.toString() ?? '');
    }

    final builder = _widgetBuilders[node.type];
    if (builder == null) {
      if (kDebugMode) {
        return devError(
          node,
          'No builder registered.\n'
          'Call register(\'${node.type}\', ...) before using it.',
        );
      }
      return Text('[unknown: ${node.type}]');
    }

    return builder(node);
  }

  Widget devError(FuseNode node, String message) {
    final label = node.component != null
        ? '<${node.type}> #${node.id} in <${node.component}>'
        : '<${node.type}> #${node.id}';
    debugPrint('[Fuse] $label: $message');
    final propsStr = node.props.toString();
    final truncated = propsStr.length > 300
        ? '${propsStr.substring(0, 300)}…'
        : propsStr;
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
    final scope = context
        .dependOnInheritedWidgetOfExactType<FuseRuntimeScope>();
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
