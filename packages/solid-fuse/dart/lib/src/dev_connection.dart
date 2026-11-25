import 'dart:async';
import 'dart:convert';

import 'package:solid_fuse/fjs.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

import 'channels.dart';
import 'connection.dart';
import 'engine.dart';
import 'ws_manager.dart';

/// Connects to a Vite dev server, pre-fetches all ES modules, and evaluates
/// them in QuickJS with module support. Listens for HMR updates via Vite's
/// WebSocket to auto-reload on file changes.
///
/// The server may come and go: a phone leaves the network, sleeps, or opens
/// the app again later away from the computer. Whenever the app comes to the
/// front or its socket drops, it asks the server for its version
/// (`/__fuse_version`, cli/dev-version-plugin.ts): the same one only
/// reconnects, another one (changes it missed, a restarted server) reloads.
/// Until a server answers it runs [bundle], if the app has one.
class DevServerConnection extends FuseConnection {
  DevServerConnection({
    required this.host,
    this.port = 24680,
    this.bundle = false,
    this.wait = false,
    this.builtins,
    this.modules,
  });

  final String host;
  final int port;

  /// Whether the app carries a JS bundle built for this launch (`fuse dev`
  /// builds one for compiled builds): run it while the server can't be
  /// reached, and switch to the live code when it can.
  final bool bundle;

  /// With no [bundle], wait for the server to be reachable instead of
  /// throwing from [connect].
  final bool wait;

  final JsBuiltinOptions? builtins;
  final List<JsModule>? modules;

  JsEngine? _engine;
  FuseChannels? _channels;
  FuseWsManager? _wsManager;
  WidgetsBindingObserver? _hostObserver;
  final _modules = <String, String>{};
  WebSocketChannel? _hmrChannel;

  /// Whether the engine runs the server's code at [_version]; false while it
  /// runs the bundle, or after a reload failed.
  bool _live = false;
  String? _version;

  /// Whether the JS running now came from the dev server (else the bundle).
  bool get live => _live;

  /// Memory ceiling (bytes) before forcing a full reload to reclaim
  /// accumulated QuickJS module declarations that can't be freed individually.
  static const _hmrMemoryLimit = 1024 * 1024 * 1024; // 1GB

  String get _baseUrl => 'http://$host:$port';

  @override
  bool get isConnected => _engine != null;

  @override
  FuseChannels? get channels => _channels;

  /// Fetches the live code, or settles for [bundle] when the server can't be
  /// reached; with neither, waits ([wait]) or throws. A server that answers
  /// with an error (a module that fails to transform) won't fix itself by
  /// retrying: that throws either way.
  @override
  Future<void> connect() async {
    for (var attempt = 0;; attempt++) {
      try {
        final version = await _probe();
        await _prefetchModule(_entryPath);
        debugPrint('[Fuse] Pre-fetched ${_modules.length} modules');
        _live = true;
        _version = version;
        break;
      } catch (e) {
        _modules.clear();
        if (!_unreachable(e) || (!bundle && !wait)) rethrow;
        if (bundle) {
          debugPrint('[Fuse] Dev server unreachable at $host:$port ($e). Running the bundled JS until it is.');
          break;
        }
        // The first attempt often fails on iOS while the Local Network
        // prompt is up; closing it resumes the app, so retry then.
        if (attempt == 0) {
          debugPrint(
            '[Fuse] Dev server unreachable at $host:$port ($e). '
            'Waiting for it — on iOS, allow Local Network access.',
          );
        }
        await _retrySignal(Duration(seconds: attempt < 5 ? 1 : 3));
      }
    }
    await _createEngine();
  }

  @override
  Future<void> start() async {
    if (_live) {
      await _evalEntry(_entryPath);
      _connectHmr();
    } else {
      await _evalBundle();
    }
    _lifecycle = AppLifecycleListener(onResume: _check);
    // A socket can die without a word (the network went away under it):
    // check now and then while the app is in front.
    _heartbeat = Timer.periodic(const Duration(seconds: 15), (_) {
      final state = WidgetsBinding.instance.lifecycleState;
      if (state != AppLifecycleState.paused && state != AppLifecycleState.hidden) _check();
    });
    if (!_live) _scheduleCheck();
  }

  static const _entryPath = '/src/index.tsx';

  Future<void> _evalBundle() async {
    try {
      final source = await rootBundle.loadString('assets/js/bundle.js');
      await _engine!.eval(source: JsCode.code(source));
    } catch (e, st) {
      debugPrint('[Fuse] Bundled JS failed: $e\n$st');
    }
  }

  // ---------------------------------------------------------------------------
  // Reaching the server
  // ---------------------------------------------------------------------------

  AppLifecycleListener? _lifecycle;
  Timer? _heartbeat;
  Timer? _retry;
  int _misses = 0;
  bool _checking = false;

  /// Can't reach the server (as opposed to: it answered with an error).
  static bool _unreachable(Object e) => e is http.ClientException || e is TimeoutException;

  /// The server's version, or null from a server that doesn't say. Throws
  /// when it can't be reached; a phone off the network may not even fail
  /// fast, so give up after a few seconds.
  Future<String?> _probe() async {
    final r = await http.get(Uri.parse('$_baseUrl/__fuse_version')).timeout(const Duration(seconds: 3));
    return r.statusCode == 200 ? r.body : null;
  }

  /// Completes when the app resumes (a system prompt closed) or after [delay].
  static Future<void> _retrySignal(Duration delay) {
    final done = Completer<void>();
    final listener = AppLifecycleListener(onResume: () {
      if (!done.isCompleted) done.complete();
    });
    final timer = Timer(delay, () {
      if (!done.isCompleted) done.complete();
    });
    return done.future.whenComplete(() {
      timer.cancel();
      listener.dispose();
    });
  }

  /// Checks the server again soon, while the app is in front (coming back
  /// to the front checks right away).
  void _scheduleCheck() {
    if (_retry?.isActive ?? false) return;
    final state = WidgetsBinding.instance.lifecycleState;
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) return;
    _retry = Timer(Duration(seconds: _misses++ < 5 ? 2 : 5), _check);
  }

  /// Is the server there, and does the app run what it serves? Reload when
  /// it doesn't, reconnect the socket when only that was lost.
  Future<void> _check() async {
    if (_checking) return;
    _checking = true;
    try {
      final String? version;
      try {
        version = await _probe();
      } catch (e) {
        if (_hmrOpen) debugPrint('[Fuse] Dev server unreachable ($e)');
        _closeHmr();
        _scheduleCheck();
        return;
      }
      _misses = 0;
      if (!_live || version != _version) {
        debugPrint(_live ? '[Fuse] Dev server changed meanwhile: reloading' : '[Fuse] Dev server reachable: loading the live code');
        _closeHmr();
        await _serially(_reload);
        if (!_live) return _scheduleCheck();
        _connectHmr();
      } else if (!_hmrOpen) {
        _connectHmr();
      }
    } finally {
      _checking = false;
    }
  }

  @override
  Future<void> restart() => _serially(_reload);

  Future<void> _createEngine() async {
    // Retire the old engine before swapping in the new one: stop its driver,
    // close its sockets, free its runtime (safe since fjs fixed #8).
    final oldEngine = _engine;
    final oldWsManager = _wsManager;
    final oldHostObserver = _hostObserver;
    _engine = null;
    if (oldEngine != null &&
        oldWsManager != null &&
        oldHostObserver != null) {
      await retireEngine(oldEngine, oldWsManager, oldHostObserver);
    }

    final (:engine, :wsManager, :channels, :hostObserver) =
        await createEngine(
      builtins: builtins,
      modules: modules,
    );
    _engine = engine;
    _channels = channels;
    _wsManager = wsManager;
    _hostObserver = hostObserver;
  }

  Future<void> _evalEntry(String entryPath) async {
    // Tell JS where to POST dev errors so the Vite plugin can symbolicate
    // and print them in the `fuse dev` terminal.
    await _engine!.eval(
      source: JsCode.code(
        'globalThis.__fuseDevServer = ${jsonEncode(_baseUrl)};\n',
      ),
    );

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

    final bust = _bustTimestamp == null
        ? ''
        : '${path.contains('?') ? '&' : '?'}t=$_bustTimestamp';
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

  bool _hmrOpen = false;
  int _hmrSocket = 0;

  void _connectHmr() {
    _closeHmr();
    final socket = _hmrSocket;
    bool current() => socket == _hmrSocket;
    void lost(String why) {
      if (!current()) return;
      _hmrOpen = false;
      debugPrint('[Fuse] HMR WebSocket $why');
      _scheduleCheck();
    }

    try {
      final uri = Uri.parse('ws://$host:$port/');
      _hmrChannel = WebSocketChannel.connect(uri, protocols: ['vite-hmr']);
      _hmrOpen = true;

      debugPrint('[Fuse] HMR WebSocket connected to ws://$host:$port/');
      _hmrChannel!.stream.listen(
        (message) {
          if (!current()) return;
          try {
            final data = jsonDecode(message as String);
            final type = data is Map ? data['type'] : null;
            if (type == 'custom') {
              // Sent after each update or reload it counts.
              if (data['event'] == 'fuse:version') _version = data['data'] as String?;
              return;
            }
            debugPrint('[Fuse] HMR message: $type');
            if (type == 'update') {
              final updates = (data['updates'] as List<dynamic>?) ?? [];
              _serially(() => _hmrUpdate(updates));
            } else if (type == 'full-reload') {
              debugPrint('[Fuse] Full reload requested');
              _serially(_reload);
            }
          } catch (e) {
            debugPrint('[Fuse] HMR parse error: $e');
          }
        },
        onError: (Object e) => lost('error: $e'),
        onDone: () => lost('closed'),
      );
    } catch (e) {
      lost('could not connect: $e');
    }
  }

  void _closeHmr() {
    _hmrSocket++;
    _hmrOpen = false;
    _hmrChannel?.sink.close();
    _hmrChannel = null;
  }

  // Updates and reloads run one at a time, in the order Vite sent them: a
  // save often sends several at once, and each swaps modules (or the whole
  // engine) under the others.
  Future<void> _queue = Future.value();
  Future<void> _serially(Future<void> Function() task) {
    return _queue = _queue.then((_) => task()).catchError((Object e) {
      debugPrint('[Fuse] HMR error: $e');
    });
  }

  Future<void> _hmrUpdate(List<dynamic> updates) async {
    if (_engine == null) return;

    final total = (await _engine!.memoryUsage()).totalMemory.toInt();
    if (total > _hmrMemoryLimit) {
      debugPrint(
        '[Fuse] Memory ${total ~/ 1024}KB — full reload to reclaim',
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
        final url = '$_baseUrl$path?t=$ts';
        final response = await http.get(Uri.parse(url));
        if (response.statusCode != 200) {
          throw Exception('HMR fetch failed for $path: ${response.statusCode}');
        }

        final source = _transformModule(utf8.decode(response.bodyBytes));
        // The name Vite's own client imports it by, and the one its importers
        // now use (`?t=`): one instance, even when an import leads back to it.
        final name = '$path?t=$ts';
        // An earlier update of the same save may have brought it in already,
        // as an import: then it only needs running.
        final known = _modules[name]?.isNotEmpty ?? false;
        _modules[name] = source;

        // Vite names the modules this update invalidated with `?t=`, so they
        // are new to the engine, and so is anything they import first: declare
        // every module fetched here, not only the direct imports.
        final before = _modules.keys.toSet();
        _bustTimestamp = DateTime.now().millisecondsSinceEpoch;
        await Future.wait(_scanImports(source).map(_prefetchModule));
        final added = [
          for (final m in _modules.keys)
            if (!before.contains(m) && _modules[m]!.isNotEmpty)
              JsModule.code(module: m, code: _modules[m]!),
        ];
        if (added.isNotEmpty) {
          await _engine!.declareNewModules(modules: added);
        }

        await _engine!.evaluateModule(
          module: known
              ? JsModule.code(module: '$name&run', code: 'import ${jsonEncode(name)};')
              : JsModule.code(module: name, code: source),
        );
        await _engine!.eval(
          source: JsCode.code(
            '{ const hot = globalThis.__fuseHot["$path"];\n'
            '  if (hot && hot._acceptCb) hot._acceptCb({}); }',
          ),
        );
        // Flush via channels — __dispatch auto-flushes solidFlush + flush
        await _channels!.send('_flush', {});

        await _engine!.runGc();
      }
    } catch (e, st) {
      debugPrint('[Fuse] HMR update failed: $e\n$st');
      debugPrint('[Fuse] Falling back to full reload');
      await _reload();
    }
  }

  /// Loads the server's code from scratch into a new engine. Sets [_live]
  /// to whether that worked.
  Future<void> _reload() async {
    try {
      _modules.clear();
      _bustTimestamp = DateTime.now().millisecondsSinceEpoch;
      final version = await _probe();
      await _prefetchModule(_entryPath);
      debugPrint('[Fuse] Re-fetched ${_modules.length} modules');
      await _createEngine();
      onEngineReplaced?.call();
      await _evalEntry(_entryPath);
      _live = true;
      _version = version;
      debugPrint('[Fuse] HMR reload complete');
    } catch (e, st) {
      _live = false;
      debugPrint('[Fuse] Reload error: $e\n$st');
    }
  }

  @override
  void dispose() {
    _retry?.cancel();
    _heartbeat?.cancel();
    _lifecycle?.dispose();
    _closeHmr();
  }
}
