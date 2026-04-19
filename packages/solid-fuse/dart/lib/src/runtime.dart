import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'connection.dart';
import 'controllers/scroll_controller.dart';
import 'dev_connection.dart';
import 'fuse_controller.dart';
import 'fuse_page.dart';
import 'node.dart';
import 'quickjs_connection.dart';
import 'routes/material_page.dart';
import 'widgets/gesture_detector.dart';
import 'widgets/navigator.dart';
import 'widgets/positioned.dart';
import 'widgets/scroll_view.dart';
import 'widgets/stack.dart';
import 'widgets/text.dart';
import 'widgets/view.dart';

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

/// The Fuse runtime: manages the JS connection, widget registry, and tree rendering.
class FuseRuntime {
  FuseRuntime._() {
    registry = FuseNodeRegistry(callFunction: callFunction);
    // Pre-create root node so it exists before JS sends ops.
    registry.create(0, 'root', {'_id': 0});
    _registerCore();
  }

  /// Register Fuse's built-in widgets, controllers, and pages.
  /// Runs on construction so callers never need to register them manually.
  void _registerCore() {
    registerWidget('view', FuseViewWidget.new);
    registerWidget('text', FuseText.new);
    registerWidget('gestureDetector', FuseGestureDetector.new);
    registerWidget('navigator', FuseNavigatorWidget.new);
    registerWidget('scrollView', FuseScrollView.new);
    registerWidget('stack', FuseStack.new);
    registerWidget('positioned', FusePositioned.new);
    registerController('scrollController', FuseScrollController.new);
    registerPage('materialPage', FuseMaterialPage.new);
  }

  FuseConnection? _connection;

  final Map<String, FuseWidgetBuilder> _registry = {};
  final Map<String, FuseController Function(FuseNode node)> _controllerFactories = {};
  final Map<String, FusePage Function(FuseNode node)> _pageFactories = {};
  late final FuseNodeRegistry registry;

  /// Construct a runtime. Does FFI init only — does NOT start the JS engine.
  ///
  /// Call [registerWidget] / [registerController] / [registerPage] and any
  /// workspace-package `register()` functions BEFORE calling [start]. Once
  /// the JS bundle starts evaluating, it will push create ops that require
  /// those factories to already be in place.
  static Future<FuseRuntime> create() async {
    await LibFjs.init();
    return FuseRuntime._();
  }

  /// Register a widget type.
  void registerWidget(String type, FuseWidgetBuilder builder) {
    _registry[type] = builder;
  }

  /// Register a controller type (non-widget node, e.g. scroll controllers).
  void registerController(String type, FuseController Function(FuseNode node) factory) {
    _controllerFactories[type] = factory;
  }

  /// Register a page type for use as navigator children.
  void registerPage(String type, FusePage Function(FuseNode node) factory) {
    _pageFactories[type] = factory;
  }

  /// Build a [Page] for a node, or null if it's not a registered page.
  Page? buildPageForNode(FuseNode node) {
    return _pageFactories[node.type]?.call(node).build();
  }

  /// Start the JS engine. In debug mode, connects to the Vite dev server
  /// (pre-fetches modules from Vite) and falls back to the QuickJS bundle
  /// if unavailable. In release mode, loads the QuickJS bundle directly.
  ///
  /// All widget/controller/page factories must be registered before this is
  /// called — once the JS bundle starts evaluating, it will push create ops
  /// that require those factories to already be in place.
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
    channels.on('_controllerCall', (data) async {
      final ref = data['ref'] as int;
      final method = data['method'] as String;
      final value = data['value'];
      final node = registry.tryGet(ref);
      if (node == null) throw StateError('No node for controller ref $ref');
      final controller = node.controller as FuseController?;
      if (controller == null || node.nativeObject == null) {
        throw StateError('No controller for node $ref');
      }
      return await controller.call(
        node.nativeObject as dynamic,
        method,
        value,
      );
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
          final controllerFactory = _controllerFactories[type];
          if (controllerFactory != null) {
            final controller = controllerFactory(node);
            final obj = controller.create();
            node.nativeObject = obj;
            node.controller = controller;
            node.onDispose = () => controller.dispose(obj);
          }
        case 'setText':
          final node = registry.get(map['id'] as int);
          node.setPropSilent('text', map['text']);
          dirty.add(node);
          if (node.parent != null) dirty.add(node.parent!);
        case 'setProp':
          final node = registry.get(map['id'] as int);
          var value = map['value'];
          // Resolve controller references
          if (value is Map && value.containsKey('_ref')) {
            final refNode = registry.get(value['_ref'] as int);
            value = refNode.nativeObject ?? refNode;
          }
          node.setPropSilent(map['name'] as String, value);
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
          registry.remove(map['id'] as int);
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
    if (node.type == 'root') return node.flexChildren;

    if (node.type == '__text__') {
      return Text(node.props['text']?.toString() ?? '');
    }

    final builder = _registry[node.type];
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
