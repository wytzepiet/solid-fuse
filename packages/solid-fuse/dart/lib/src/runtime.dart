import 'dart:convert';

import 'package:solid_fuse/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'channels.dart';
import 'connection.dart';
import 'dev_connection.dart';
import 'fuse_handle.dart';
import 'generated_support.dart' show FuseCallArgs, FuseCallbackError;
import 'node.dart';
import 'quickjs_connection.dart';

/// Signature for a Fuse widget builder.
/// Matches the constructor signature of Fuse widget classes,
/// so you can register with `register('type', MyWidget.new)`.
typedef FuseWidgetBuilder = Widget Function(FuseNode node);

/// Builds the widget itself for [node] in [context], for a slot that takes a
/// particular widget type (generated adapters register one).
typedef FuseWidgetMaker = Widget Function(FuseNode node, BuildContext context);

/// Makes the route a `<modal>` node pushes while it is open. [context] is
/// the modal's (for themes to carry over); [content] builds the node's
/// children; put it where the route shows its page. Registered per route
/// type with [FuseRuntime.registerRoute].
typedef FuseRouteFactory = Route<Object?> Function(BuildContext context, FuseNode node, WidgetBuilder content);

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
    registry = FuseNodeRegistry(
      callFunction: callFunction,
      callFunctionAsync: callFunctionAsync,
      callFunctionSync: callFunctionSync,
      unbuild: unbuild,
    );
    // Pre-create root node so it exists before JS sends ops.
    registry.create(0, 'root', {'_id': 0});
  }

  /// A runtime with no JS engine behind it, for tests that drive [applyOps]
  /// directly. Never calls into fjs; [start] must not be called on it.
  @visibleForTesting
  FuseRuntime.forTest() : this._();

  FuseConnection? _connection;

  final Map<String, FuseWidgetBuilder> _widgetBuilders = {};
  final Map<String, FuseWidgetMaker> _widgetMakers = {};
  final Map<String, FuseHandle Function(FuseNode node)> _handleFactories = {};
  final Map<String, FuseRouteFactory> _routeFactories = {};
  late final FuseNodeRegistry registry;

  /// Construct a runtime. Does FFI init only — does NOT start the JS engine.
  ///
  /// Call [registerWidget] / [registerHandle] and any workspace-package
  /// `register()` functions BEFORE calling [start]. Once the JS bundle
  /// starts evaluating, it will push create ops that require those factories
  /// to already be in place.
  static Future<FuseRuntime> create() async {
    await initFjs();
    return FuseRuntime._();
  }

  /// Register a widget type — maps a node type to a Flutter Widget builder.
  void registerWidget(String type, FuseWidgetBuilder builder, {FuseWidgetMaker? make}) {
    _widgetBuilders[type] = builder;
    if (make != null) _widgetMakers[type] = make;
  }

  /// Register a handle type — maps a node type to a [FuseHandle] factory.
  /// Used for non-widget nodes: focus nodes, scroll controllers, pages,
  /// navigator, any persistent Dart object that backs a JS-side handle.
  void registerHandle(String type, FuseHandle Function(FuseNode node) factory) {
    _handleFactories[type] = factory;
  }

  /// Register a route type for `<modal type="...">`: a dialog, a bottom
  /// sheet, a popup. Core registers `dialog`; design packages add theirs.
  void registerRoute(String type, FuseRouteFactory factory) {
    _routeFactories[type] = factory;
  }

  /// The factory registered for route [type], or null.
  FuseRouteFactory? routeFactory(String type) => _routeFactories[type];

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
      final dev = DevServerConnection(host: _devHost, port: _devPort);
      try {
        await dev.connect();
      } catch (e) {
        debugPrint(
          '[Fuse] Dev server unreachable at $_devHost:$_devPort — falling back to QuickJS bundle',
        );
        await _startQuickJs();
        return;
      }

      _connection = dev;
      _registerChannels();
      try {
        await dev.start();
        debugPrint('[Fuse] Connected to dev server at $_devHost');
        return;
      } catch (e) {
        // The dev server was reachable but evaluating the JS modules threw.
        // Don't fall back — the QuickJS bundle is built from the same source
        // and would fail the same way (or worse: succeed against stale code,
        // hiding the real error). Print a clean JS-only trace and rethrow.
        debugPrint('[Fuse] JS error during dev startup:\n${_formatJsError(e)}');
        rethrow;
      }
    }

    await _startQuickJs();
  }

  Future<void> _startQuickJs() async {
    final qjs = QuickJsConnection();
    await qjs.connect();
    _connection = qjs;
    _registerChannels();
    await qjs.start();
  }

  /// Strip the FFI wrapping (`AnyhowException(Runtime error: …)`) and the
  /// Rust backtrace from a JS-runtime error so what's left is the JS message
  /// plus the JS stack — the part actually useful for fixing your code.
  String _formatJsError(Object e) {
    var msg = e.toString();
    msg = msg.replaceFirst(
      RegExp(r'^AnyhowException\(Runtime error:\s*'),
      '',
    );
    final rustIdx = msg.indexOf('Stack backtrace:');
    if (rustIdx >= 0) msg = msg.substring(0, rustIdx).trimRight();
    if (msg.endsWith(')')) msg = msg.substring(0, msg.length - 1).trimRight();
    return msg;
  }

  /// Register runtime-level channel handlers.
  void _registerChannels() {
    final channels = _connection!.channels!;
    channels.on('_ops', (data) {
      try {
        // JS sends each batch as one JSON string (see flushOps in
        // renderer.ts).
        _checkOpsVersion(data['v']);
        applyBatch(data['g'] as int?, data['b'] as int?, data['json'] as String, bytes: data['bytes'] as List?);
      } catch (e, st) {
        debugPrint('[Fuse] ops error: $e\n$st');
      }
    });
    // JS let go of a handle Dart lent it (see FuseNodeRegistry.lend).
    channels.on('_unborrow', (data) {
      registry.unborrow(data['id'] as int, data['n'] as int);
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

  void _checkOpsVersion(Object? version) {
    if (version != opsVersion) {
      throw StateError(
        'The JS bundle speaks op format ${version ?? 1}, this runtime '
        'speaks $opsVersion. Rebuild the bundle and the app with the '
        'same solid-fuse version.',
      );
    }
  }

  // The JS evaluation the applied batches came from, and the last batch
  // applied. A synchronous call carries the batches whose messages are still
  // queued here; when those messages arrive they are skipped.
  int? _generation;
  int _applied = -1;

  /// Applies batch [b] of JS evaluation [g], unless it is already applied.
  @visibleForTesting
  void applyBatch(int? g, int? b, String json, {List? bytes, bool duringFrame = false}) {
    if (g != _generation) {
      _generation = g;
      _applied = -1;
    }
    if (b != null) {
      if (b <= _applied) return;
      _applied = b;
    }
    final ops = jsonDecode(json) as List<dynamic>;
    if (bytes != null) _resolveBytes(ops, bytes);
    applyOps(ops, duringFrame: duringFrame);
  }

  /// Puts the batch's binary values where their `{$bytes: i}` markers are.
  static Object? _resolveBytes(Object? v, List bytes) {
    if (v is Map) {
      if (v[r'$bytes'] case final int i when v.length == 1) return bytes[i] as Uint8List;
      for (final MapEntry(:key, :value) in v.entries.toList()) {
        final r = _resolveBytes(value, bytes);
        if (!identical(r, value)) v[key] = r;
      }
    } else if (v is List) {
      for (var i = 0; i < v.length; i++) {
        final r = _resolveBytes(v[i], bytes);
        if (!identical(r, v[i])) v[i] = r;
      }
    }
    return v;
  }

  /// Call a JS function and block until it returns, applying the ops it
  /// produced first. With [widget], the result is a node built in a root of
  /// its own, which [unbuild] releases: `(node, root)`. A throw becomes a
  /// [FuseCallbackError].
  (Object?, int?) callFunctionSync(int nodeId, String name, Object? value, {bool widget = false}) {
    final data = <String, dynamic>{
      'nodeId': nodeId,
      'name': name,
      if (value is FuseCallArgs) 'args': value.args else 'value': ?value,
      if (widget) 'widget': true,
    };
    final Object? reply;
    if (debugCallSync case final fake?) {
      reply = fake('_callSync', data);
    } else {
      final channels = _connection?.channels;
      if (channels == null) throw FuseCallbackError(name, 'no JS connection');
      reply = channels.callSync('_callSync', data);
    }
    if (reply is! Map) throw FuseCallbackError(name, 'no reply');
    final ops = reply['ops'];
    if (ops is Map) {
      _checkOpsVersion(ops['v']);
      for (final batch in ops['batches'] as List) {
        final l = batch as List;
        applyBatch(ops['g'] as int?, l[0] as int, l[1] as String, bytes: l.length > 2 ? l[2] as List : null, duringFrame: true);
      }
    }
    final r = reply['result'];
    if (r is! Map) throw FuseCallbackError(name, 'no result');
    if (r.containsKey('error')) throw FuseCallbackError(name, '${r['error']}');
    final v = r['value'];
    if (!widget) return (v, null);
    final node = v is Map && v['_node'] is int ? registry.tryGet(v['_node'] as int) : null;
    return (node, r['root'] as int?);
  }

  /// Releases the root of a widget [callFunctionSync] built.
  void unbuild(int root) {
    if (debugUnbuild case final fake?) return fake(root);
    _connection?.channels?.send('_unbuild', {'root': root});
  }

  /// Stands in for JS in [callFunctionSync] and [unbuild] (tests).
  @visibleForTesting
  Object? Function(String channel, Map<String, dynamic> data)? debugCallSync;
  @visibleForTesting
  void Function(int root)? debugUnbuild;

  /// No-op: connections are reused across hot restarts, never disposed.
  void dispose() {}

  /// Call a JS function via the bridge. A [FuseCallArgs] value is spread
  /// into the handler's parameters.
  void callFunction(int nodeId, String name, [dynamic value]) {
    _connection?.channels?.send('_functionCall', {
      'nodeId': nodeId,
      'name': name,
      if (value is FuseCallArgs) 'args': value.args else 'value': ?value,
    });
  }

  /// Call a JS function and wait for its result; a rejected Promise or a
  /// throw becomes a [FuseCallbackError].
  Future<Object?> callFunctionAsync(int nodeId, String name, [dynamic value]) async {
    final channels = _connection?.channels;
    if (channels == null) throw FuseCallbackError(name, 'no JS connection');
    final r = await channels.call('_functionCall', {
      'nodeId': nodeId,
      'name': name,
      'reply': true,
      if (value is FuseCallArgs) 'args': value.args else 'value': ?value,
    }, timeout: null);
    if (r is Map && r.containsKey('error')) throw FuseCallbackError(name, '${r['error']}');
    return r is Map ? r['value'] : null;
  }

  /// Version of the op format [applyOps] reads; `OPS_VERSION` in
  /// renderer.ts is its JS twin.
  static const opsVersion = 4;

  // Opcodes, as in renderer.ts.
  static const _opCreate = 0;
  static const _opText = 1;
  static const _opSetProp = 2;
  static const _opSetText = 3;
  static const _opInsert = 4;
  static const _opRemove = 5;
  static const _opDispose = 6;
  static const _opDefine = 7;
  static const _opInstantiate = 8;
  static const _opProps = 9;

  /// Template shapes by id, as sent by `define` ops: `[type, props | 0,
  /// ...children]`, where a string child is a text node.
  final Map<int, List<dynamic>> _templates = {};

  /// Apply a batch of ops from the JS side.
  ///
  /// [ops] is the flat journal written by renderer.ts: an opcode followed by
  /// its operands, then the next opcode (the layout is documented there).
  ///
  /// With [duringFrame] (ops a synchronous call brought, applied while a
  /// builder runs), nodes that changed are told after the frame: a listener
  /// may be a widget that is not allowed to rebuild now.
  void applyOps(List<dynamic> ops, {bool duringFrame = false}) {
    final dirty = <FuseNode>{};
    // Nodes created in this batch whose type has a handle factory. The
    // factory runs once the batch is applied, so that it sees every prop the
    // batch set, whichever op carried it.
    List<FuseNode>? handleNodes;

    final length = ops.length;
    var i = 0;
    while (i < length) {
      switch (ops[i]) {
        case _opCreate:
          final type = ops[i + 2] as String;
          final node = registry.create(
            ops[i + 1] as int,
            type,
            ops[i + 3] as Map<String, dynamic>,
          );
          if (_handleFactories.containsKey(type)) {
            (handleNodes ??= []).add(node);
          }
          i += 4;
        case _opText:
          registry.create(ops[i + 1] as int, '__text__', {'text': ops[i + 2]});
          i += 3;
        case _opSetProp:
          final node = registry.get(ops[i + 1] as int);
          final name = ops[i + 2] as String;
          var value = ops[i + 3];
          if (value is Map && value.containsKey('_node')) {
            value = registry.get(value['_node'] as int);
          }
          node.setPropSilent(name, value);
          dirty.add(node);
          i += 4;
        case _opSetText:
          final node = registry.get(ops[i + 1] as int);
          node.setTextSilent(ops[i + 2]);
          dirty.add(node);
          if (node.parent != null) dirty.add(node.parent!);
          i += 3;
        case _opInsert:
          final parent = registry.get(ops[i + 1] as int);
          final child = registry.get(ops[i + 2] as int);
          final before = ops[i + 3] as int?;
          i += 4;
          if (child.id == before) break;
          // Inserting an attached node moves it (DOM `insertBefore`
          // semantics, mirrored by `insertNode` in renderer.ts): detach it
          // first so it is never listed twice.
          final oldParent = child.parent;
          if (oldParent != null) {
            oldParent.removeChildSilent(child);
            dirty.add(oldParent);
          }
          parent.insertChildSilent(
            child,
            before: before == null ? null : registry.tryGet(before),
          );
          dirty.add(parent);
        case _opRemove:
          final child = registry.get(ops[i + 1] as int);
          i += 2;
          final parent = child.parent;
          if (parent != null) {
            parent.removeChildSilent(child);
            dirty.add(parent);
          }
        case _opDispose:
          final node = registry.tryGet(ops[i + 1] as int);
          i += 2;
          if (node == null) break;
          final parent = node.parent;
          if (parent != null) {
            parent.removeChildSilent(node);
            dirty.add(parent);
          }
          _removeSubtree(node, dirty);
        case _opDefine:
          _templates[ops[i + 1] as int] = ops[i + 2] as List<dynamic>;
          i += 3;
        case _opInstantiate:
          final shape = _templates[ops[i + 1] as int];
          if (shape == null) {
            throw StateError('Unknown template ${ops[i + 1]} at $i');
          }
          final component = ops[i + 3] as String?;
          final created = handleNodes ??= [];
          _instantiate(shape, ops[i + 2] as int, null, component, created);
          i += 4;
        case _opProps:
          final node = registry.get(ops[i + 1] as int);
          node.props.addAll(ops[i + 2] as Map<String, dynamic>);
          dirty.add(node);
          i += 3;
        default:
          throw StateError('Unknown op ${ops[i]} at $i');
      }
    }

    if (handleNodes != null) {
      for (final node in handleNodes) {
        // Created and disposed in the same batch: nothing to back.
        if (!identical(registry.tryGet(node.id), node)) continue;
        node.ownHandle = _handleFactories[node.type]!(node);
      }
    }

    if (duringFrame && dirty.isNotEmpty && SchedulerBinding.instance.schedulerPhase != SchedulerPhase.idle) {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        for (final node in dirty) {
          if (identical(registry.tryGet(node.id), node)) node.markDirty();
        }
      });
      SchedulerBinding.instance.scheduleFrame();
      return;
    }
    for (final node in dirty) {
      node.markDirty();
    }
  }

  /// Build the nodes of [shape] under [parent], giving them consecutive ids
  /// from [id] in document order. Returns the next free id.
  int _instantiate(
    List<dynamic> shape,
    int id,
    FuseNode? parent,
    String? component,
    List<FuseNode> handleNodes,
  ) {
    final type = shape[0] as String;
    final shared = shape[1];
    // Each instance owns its props map (ops write to it); nested values are
    // shared with the shape and never mutated.
    final props = shared is Map<String, dynamic>
        ? Map<String, dynamic>.of(shared)
        : <String, dynamic>{};
    if (component != null) props['_component'] = component;
    final node = registry.create(id++, type, props);
    if (_handleFactories.containsKey(type)) handleNodes.add(node);
    parent?.insertChildSilent(node);
    for (var k = 2; k < shape.length; k++) {
      final child = shape[k];
      if (child is String) {
        node.insertChildSilent(
          registry.create(id++, '__text__', {'text': child}),
        );
      } else {
        id = _instantiate(child as List<dynamic>, id, node, component, handleNodes);
      }
    }
    return id;
  }

  /// Recursively remove a node and its descendants from the registry,
  /// disposing their ChangeNotifiers. Also removes them from [dirty] to
  /// prevent notifying disposed nodes. Nodes referenced by props are not
  /// part of the subtree: JS disposes those itself when it lets go of them.
  void _removeSubtree(FuseNode node, Set<FuseNode> dirty) {
    for (var child = node.firstChild; child != null; child = child.nextSibling) {
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

    // What a builder returned that is not one element (text, a list, a
    // reactive value): its children, as a `child` slot shows them.
    if (node.type == '__slot__') {
      return node.children.isEmpty ? const SizedBox.shrink() : node.flexChildren;
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

  /// The widget itself for [node], built in [context]: what its maker
  /// makes, or else what [buildWidgetForNode] gives.
  Widget makeWidgetForNode(FuseNode node, BuildContext context) =>
      _widgetMakers[node.type]?.call(node, context) ?? buildWidgetForNode(node);

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
        border: Border.all(color: const Color(0xFFF44336), width: 3),
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
///
/// When JS renders an app root (`<App>`, `<MaterialApp>`...), `runApp` it
/// on its own; it also works inside a Dart app, as part of a screen.
class FuseView extends StatelessWidget {
  const FuseView({super.key, required this.runtime});

  final FuseRuntime runtime;

  @override
  Widget build(BuildContext context) {
    final root = runtime.registry.get(0);
    Widget view = FuseRuntimeScope(
      runtime: runtime,
      child: ListenableBuilder(
        listenable: root,
        builder: (context, _) => runtime.buildWidgetForNode(root),
      ),
    );
    // Run on its own, nothing above gives a text direction until the app
    // root mounts; layout before that still needs one.
    if (Directionality.maybeOf(context) == null) {
      view = Directionality(textDirection: TextDirection.ltr, child: view);
    }
    return view;
  }
}
