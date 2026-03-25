import 'dart:convert';

import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

import 'channels.dart';
import 'connection.dart';
import 'engine.dart';

/// Connects to a Vite dev server, pre-fetches all ES modules, and evaluates
/// them in QuickJS with module support. Listens for HMR updates via Vite's
/// WebSocket to auto-reload on file changes.
class DevServerConnection extends FuseConnection {
  DevServerConnection({required this.host, this.port = 5173, this.builtin, this.additional});

  final String host;
  final int port;
  final JsBuiltinOptions? builtin;
  final List<JsModule>? additional;

  JsEngine? _engine;
  JsAsyncRuntime? _runtime;
  FuseChannels? _channels;
  final _modules = <String, String>{};
  WebSocketChannel? _hmrChannel;

  /// Memory ceiling (bytes) before forcing a full reload to reclaim
  /// accumulated QuickJS module declarations that can't be freed individually.
  static const _hmrMemoryLimit = 1024 * 1024 * 1024; // 1GB

  String get _baseUrl => 'http://$host:$port';

  @override
  bool get isConnected => _engine != null;

  @override
  FuseChannels? get channels => _channels;

  @override
  Future<void> connect() async {
    _runtime = await createRuntime(builtin: builtin, additional: additional);

    const entryPath = '/src/index.tsx';
    await _prefetchModule(entryPath);
    debugPrint('[Fuse] Pre-fetched ${_modules.length} modules');

    await _createEngine();
  }

  @override
  Future<void> start() async {
    const entryPath = '/src/index.tsx';
    await _evalEntry(entryPath);
    _connectHmr();
  }

  @override
  Future<void> restart() async {
    await _reload();
  }

  Future<void> _createEngine() async {
    // Park old engine — new context+engine will be created on the same runtime.
    final oldEngine = _engine;
    _engine = null;
    if (oldEngine != null) retiredEngines.add(oldEngine);

    final (:engine, :wsManager, :channels) = await createEngine(
      runtime: _runtime!,
    );
    _engine = engine;
    _channels = channels;
  }

  Future<void> _evalEntry(String entryPath) async {
    // Inject HMR hot context shim before loading modules
    await _engine!.eval(
      source: JsCode.code(
        'globalThis.__fuseHot = {};\n'
        'globalThis.__fuseCreateHot = (ownerPath) => {\n'
        '  if (__fuseHot[ownerPath]) return __fuseHot[ownerPath];\n'
        '  const hot = {\n'
        '    data: {},\n'
        '    _acceptCb: null,\n'
        '    _disposeCbs: [],\n'
        '    accept(cb) { hot._acceptCb = typeof cb === "function" ? cb : () => {}; },\n'
        '    dispose(cb) { if (typeof cb === "function") hot._disposeCbs.push(cb); },\n'
        '    invalidate() { fjs.bridge_call({ channel: "_log", message: "[HMR] invalidate: " + ownerPath }); },\n'
        '    decline() {},\n'
        '  };\n'
        '  __fuseHot[ownerPath] = hot;\n'
        '  return hot;\n'
        '};\n',
      ),
    );

    // Declare all dependency modules upfront
    final depModules = _modules.entries
        .where((e) => e.key != entryPath)
        .map((e) => JsModule.code(module: e.key, code: e.value))
        .toList();
    if (depModules.isNotEmpty) {
      await _engine!.declareNewModules(modules: depModules);
    }

    // Evaluate entry module
    await _engine!.evaluateModule(
      module: JsModule.code(module: entryPath, code: _modules[entryPath]!),
    );

    // Drain only immediate jobs — do NOT use drainJobs (runtime.idle) here
    // because long-lived Promises (e.g. WebSocket connections from Convex)
    // would deadlock: they wait for Dart bridge events that can't fire while
    // idle() blocks the Dart event loop.
    await drainImmediateJobs(_runtime!);
  }

  // ---------------------------------------------------------------------------
  // Module fetching & transformation
  // ---------------------------------------------------------------------------

  /// Paths that should not be fetched or declared — they are Vite/HMR browser
  /// modules that can't run in QuickJS.
  static bool _isViteOnly(String path) =>
      path.startsWith('/@vite/') || path.startsWith('/node_modules/vite/');

  /// Transforms Vite-served module source for QuickJS:
  /// - Strips /@vite/client imports (browser-only)
  /// - Keeps /@solid-refresh imports (HMR runtime)
  /// - Replaces import.meta.hot with globalThis.__fuseHot shim
  /// - Wraps render() calls to capture cleanup for HMR dispose
  static String _transformModule(String source) {
    var s = source;

    // Remove: import { ... } from "/@vite/client";
    s = s.replaceAll(
      RegExp(r'''import\s+\{[^}]*\}\s+from\s+["']/@vite/[^"']*["']\s*;?'''),
      '',
    );

    // Extract module path from __vite__createHotContext("/src/index.tsx")
    final hotCtxMatch = RegExp(
      r'''__vite__createHotContext\(\s*["']([^"']+)["']\s*\)''',
    ).firstMatch(s);
    final modulePath = hotCtxMatch?.group(1);

    if (modulePath != null) {
      s = s.replaceAll(
        RegExp(
          r'import\.meta\.hot\s*=\s*__vite__createHotContext\([^)]*\)\s*;?',
        ),
        'globalThis.__fuseHot["$modulePath"] = __fuseCreateHot("$modulePath");',
      );
      s = s.replaceAll(
        'import.meta.hot',
        'globalThis.__fuseHot["$modulePath"]',
      );

      s = s.replaceAllMapped(
        RegExp(r'(?:^|(?<=;|\n)\s*)(render\s*\([^;]*\))\s*;', multiLine: true),
        (m) =>
            'const __fuse_cleanup = ${m.group(1)};\n'
            'if (globalThis.__fuseHot["$modulePath"]) { '
            'globalThis.__fuseHot["$modulePath"].dispose(() => { '
            'if (typeof __fuse_cleanup === "function") __fuse_cleanup(); }); }\n',
      );
    } else {
      s = s.replaceAll(RegExp(r'import\.meta\.hot\s*=\s*[^;]*;?'), '');
      s = s.replaceAll(
        RegExp(r'if\s*\(\s*import\.meta\.hot\s*\)\s*\{[^}]*\}'),
        '',
      );
    }

    return s;
  }

  /// Cache-busting timestamp appended to URLs during reload.
  int? _bustTimestamp;

  Future<void> _prefetchModule(String path) async {
    if (_modules.containsKey(path)) return;
    if (_isViteOnly(path)) return;

    _modules[path] = '';

    final bust = _bustTimestamp != null ? '?t=$_bustTimestamp' : '';
    final url = '$_baseUrl$path$bust';
    debugPrint('[Fuse] Fetching module: $path');

    final response = await http.get(Uri.parse(url));
    if (response.statusCode != 200) {
      _modules.remove(path);
      throw Exception('Failed to fetch $path: ${response.statusCode}');
    }

    final source = _transformModule(utf8.decode(response.bodyBytes));
    _modules[path] = source;

    final deps = _scanImports(source);
    await Future.wait(deps.map(_prefetchModule));
  }

  /// Scans JS source for import/export paths.
  Set<String> _scanImports(String source) {
    final deps = <String>{};

    final fromPattern = RegExp(
      r'''(?:import|export)\s+.*?from\s+["']([^"']+)["']''',
      dotAll: true,
    );
    for (final match in fromPattern.allMatches(source)) {
      deps.add(match.group(1)!);
    }

    final barePattern = RegExp(r'''import\s+["']([^"']+)["']''');
    for (final match in barePattern.allMatches(source)) {
      deps.add(match.group(1)!);
    }

    deps.removeWhere((dep) => !dep.startsWith('/'));
    return deps;
  }

  // ---------------------------------------------------------------------------
  // HMR
  // ---------------------------------------------------------------------------

  void _connectHmr() {
    try {
      final uri = Uri.parse('ws://$host:$port/');
      _hmrChannel = WebSocketChannel.connect(uri, protocols: ['vite-hmr']);

      debugPrint('[Fuse] HMR WebSocket connected to ws://$host:$port/');
      _hmrChannel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message as String);
            final type = data is Map ? data['type'] : null;
            debugPrint('[Fuse] HMR message: $type');
            if (type == 'update') {
              final updates = (data['updates'] as List<dynamic>?) ?? [];
              _hmrUpdate(updates);
            } else if (type == 'full-reload') {
              debugPrint('[Fuse] Full reload requested');
              _reload();
            }
          } catch (e) {
            debugPrint('[Fuse] HMR parse error: $e');
          }
        },
        onError: (e) {
          debugPrint('[Fuse] HMR WebSocket error: $e');
        },
        onDone: () {
          debugPrint('[Fuse] HMR WebSocket closed');
        },
      );
    } catch (e) {
      debugPrint('[Fuse] Could not connect to HMR: $e');
    }
  }

  Future<void> _hmrUpdate(List<dynamic> updates) async {
    if (_engine == null || _runtime == null) return;

    final usage = await _runtime!.memoryUsage();
    if (usage.totalMemory > _hmrMemoryLimit) {
      debugPrint(
        '[Fuse] Memory ${usage.totalMemory ~/ 1024}KB — full reload to reclaim',
      );
      return _reload();
    }

    try {
      for (final update in updates) {
        final path = update['path'] as String?;
        final timestamp = update['timestamp'];
        if (path == null || timestamp == null) continue;

        final ts = timestamp.toString();
        debugPrint('[Fuse] HMR: $path');

        await _engine!.eval(
          source: JsCode.code(
            '{ const hot = globalThis.__fuseHot["$path"];\n'
            '  if (hot) { hot._disposeCbs.forEach(cb => cb(hot.data));\n'
            '  hot._disposeCbs = []; } }',
          ),
        );
        await drainImmediateJobs(_runtime!);

        final url = '$_baseUrl$path?t=$ts';
        final response = await http.get(Uri.parse(url));
        if (response.statusCode != 200) {
          throw Exception('HMR fetch failed for $path: ${response.statusCode}');
        }

        final source = _transformModule(utf8.decode(response.bodyBytes));

        final deps = _scanImports(source);
        for (final dep in deps) {
          if (!_modules.containsKey(dep) && !_isViteOnly(dep)) {
            _bustTimestamp = DateTime.now().millisecondsSinceEpoch;
            await _prefetchModule(dep);
            if (_modules.containsKey(dep) && _modules[dep]!.isNotEmpty) {
              await _engine!.declareNewModules(
                modules: [JsModule.code(module: dep, code: _modules[dep]!)],
              );
            }
          }
        }

        final hmrModuleName = '$path?hmr=$ts';
        await _engine!.evaluateModule(
          module: JsModule.code(module: hmrModuleName, code: source),
        );
        await drainImmediateJobs(_runtime!);

        await _engine!.eval(
          source: JsCode.code(
            '{ const hot = globalThis.__fuseHot["$path"];\n'
            '  if (hot && hot._acceptCb) hot._acceptCb({}); }',
          ),
        );
        await drainImmediateJobs(_runtime!);

        // Flush via channels — __dispatch auto-flushes solidFlush + flush
        await _channels!.send('_flush', {});

        await _runtime!.runGc();
      }
    } catch (e, st) {
      debugPrint('[Fuse] HMR update failed: $e\n$st');
      debugPrint('[Fuse] Falling back to full reload');
      _reload();
    }
  }

  Future<void> _reload() async {
    try {
      _modules.clear();
      _bustTimestamp = DateTime.now().millisecondsSinceEpoch;
      const entryPath = '/src/index.tsx';
      await _prefetchModule(entryPath);
      debugPrint('[Fuse] Re-fetched ${_modules.length} modules');
      await _createEngine();
      await _evalEntry(entryPath);
      debugPrint('[Fuse] HMR reload complete');
    } catch (e, st) {
      debugPrint('[Fuse] Reload error: $e\n$st');
    }
  }

  @override
  void dispose() {}
}
