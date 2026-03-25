import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:fjs/fjs.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

class BytecodeCache {
  static String hashBundle(String source) =>
      sha256.convert(utf8.encode(source)).toString();

  Future<String> get _cacheDir async {
    final docs = await getApplicationDocumentsDirectory();
    return '${docs.path}/fuse_cache';
  }

  Future<JsScriptBytecode?> load(String bundleHash) async {
    try {
      final dir = await _cacheDir;
      final hashFile = File('$dir/bundle.hash');
      if (!hashFile.existsSync()) return null;

      final storedHash = await hashFile.readAsString();
      if (storedHash.trim() != bundleHash) return null;

      final bcFile = File('$dir/bundle.bc');
      if (!bcFile.existsSync()) return null;

      final bytes = await bcFile.readAsBytes();
      debugPrint('[Fuse] Loaded cached bytecode (${bytes.length} bytes)');
      return JsScriptBytecode(name: 'bundle.js', bytes: bytes);
    } catch (e) {
      debugPrint('[Fuse] Cache load failed: $e');
      return null;
    }
  }

  Future<JsScriptBytecode> compileAndCache(
    String bundleSource,
    String bundleHash,
  ) async {
    debugPrint('[Fuse] Compiling bundle to bytecode...');
    final bytecode = await JsBytecode.compileScript(
      name: 'bundle.js',
      source: JsCode.code(bundleSource),
      options: JsScriptBytecodeOptions.defaults(),
    );
    debugPrint('[Fuse] Compiled bytecode (${bytecode.bytes.length} bytes)');

    try {
      final dir = await _cacheDir;
      await Directory(dir).create(recursive: true);
      await File('$dir/bundle.bc').writeAsBytes(bytecode.bytes);
      await File('$dir/bundle.hash').writeAsString(bundleHash);
      debugPrint('[Fuse] Cached bytecode to $dir');
    } catch (e) {
      debugPrint('[Fuse] Cache write failed: $e');
    }

    return bytecode;
  }
}
