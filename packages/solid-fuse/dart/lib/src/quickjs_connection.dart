import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'bytecode_cache.dart';
import 'channels.dart';
import 'connection.dart';
import 'engine.dart';

/// Runs JS in-process via QuickJS (production mode).
/// Loads the pre-built bundle from assets.
class QuickJsConnection extends FuseConnection {
  QuickJsConnection({this.builtins, this.modules});

  final JsBuiltinOptions? builtins;
  final List<JsModule>? modules;
  JsEngine? _engine;
  JsScriptBytecode? _bytecode;
  FuseChannels? _channels;

  @override
  bool get isConnected => _engine != null;

  @override
  FuseChannels? get channels => _channels;

  @override
  Future<void> connect() async {
    final (:engine, :wsManager, :channels) = await createEngine(
      builtins: builtins,
      modules: modules,
    );
    _engine = engine;
    _channels = channels;
  }

  @override
  Future<void> start() async {
    try {
      final bundleSource = await rootBundle.loadString('assets/js/bundle.js');

      if (kReleaseMode) {
        final hash = BytecodeCache.hashBundle(bundleSource);
        final cache = BytecodeCache();

        var bytecode = await cache.load(hash);
        bytecode ??= await cache.compileAndCache(bundleSource, hash);
        _bytecode = bytecode;

        await _engine!.evaluateScriptBytecode(script: bytecode);
      } else {
        await _engine!.eval(source: JsCode.code(bundleSource));
      }
    } catch (e, st) {
      debugPrint('QuickJsConnection error: $e\n$st');
    }
  }

  @override
  Future<void> restart() async {
    if (_engine == null) return;
    try {
      if (_bytecode != null) {
        await _engine!.evaluateScriptBytecode(script: _bytecode!);
      } else {
        final bundleSource = await rootBundle.loadString('assets/js/bundle.js');
        await _engine!.eval(source: JsCode.code(bundleSource));
      }
    } catch (e) {
      debugPrint('[Fuse] restart error: $e');
    }
  }

  @override
  void dispose() {}
}
