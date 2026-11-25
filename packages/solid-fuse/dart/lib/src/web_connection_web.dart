import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';
import 'dart:typed_data';

import 'dart:ui_web' as ui_web;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'channels.dart';
import 'connection.dart';
import 'host.dart';

/// Runs the bundle in the browser's JS engine: a web build of the app needs
/// no QuickJS. JS reaches Dart through the `fjs.bridge_call` the bundle
/// expects, and Dart calls JS's `__dispatch` / `__dispatchSync` directly.
/// Values cross as the browser has them, shaped the way fjs shapes them.
///
/// With [devServer] (`fuse dev -d chrome`), the app's modules come from Vite
/// as ES modules; otherwise the built bundle (`assets/js/bundle.js`) runs.
class WebConnection extends FuseConnection {
  WebConnection({this.devServer});

  /// The Vite dev server's origin, e.g. `http://localhost:24680`.
  final String? devServer;

  _WebChannels? _channels;
  WidgetsBindingObserver? _observer;

  @override
  bool get isConnected => _channels != null;

  @override
  FuseChannels? get channels => _channels;

  @override
  Future<void> connect() async {
    final channels = _WebChannels();
    _channels = channels;
    globalContext['fjs'] = <String, Object?>{}.jsify();
    (globalContext['fjs'] as JSObject)['bridge_call'] = ((JSAny? v) => _bridge(channels, v)).toJS;
    final (:host, :observer) = await setUpHost(channels);
    _observer = observer;
    globalContext['__fuseHost'] = host.jsify();
  }

  @override
  Future<void> start() async {
    final dev = devServer;
    if (dev != null) {
      try {
        await importModule('$dev/src/index.tsx'.toJS).toDart;
        return;
      } catch (e) {
        debugPrint('[Fuse] dev server unreachable at $dev ($e): running the built bundle');
      }
    }
    await _runBundle();
  }

  @override
  Future<void> restart() => _runBundle();

  /// Runs the built bundle as a script of the page: no `eval`, so a page
  /// whose Content-Security-Policy forbids it can show the app.
  Future<void> _runBundle() async {
    final script = (globalContext['document'] as JSObject).callMethod<JSObject>('createElement'.toJS, 'script'.toJS);
    final done = Completer<void>();
    script['src'] = ui_web.assetManager.getAssetUrl('assets/js/bundle.js').toJS;
    script['onload'] = ((JSAny? _) => done.complete()).toJS;
    script['onerror'] = ((JSAny? _) => done.completeError(StateError('assets/js/bundle.js did not load'))).toJS;
    ((globalContext['document'] as JSObject)['head'] as JSObject).callMethod<JSAny?>('appendChild'.toJS, script);
    await done.future;
  }

  @override
  void dispose() {
    final o = _observer;
    if (o != null) WidgetsBinding.instance.removeObserver(o);
  }
}

class _WebChannels extends FuseChannels {
  @override
  Future<Object?> callJs(String channel, Map<String, dynamic> data) async {
    final r = globalContext.callMethod<JSAny?>('__dispatch'.toJS, channel.toJS, _toJs(data));
    final settled = r.isA<JSPromise>() ? await (r as JSPromise<JSAny?>).toDart : r;
    return _fromJs(settled);
  }

  @override
  Object? callJsSync(String channel, Map<String, dynamic> data) =>
      _fromJs(globalContext.callMethod<JSAny?>('__dispatchSync'.toJS, channel.toJS, _toJs(data)));
}

/// `fjs.bridge_call(value)`: a JS → Dart message, `{channel, ...data}`.
JSPromise<JSAny?> _bridge(FuseChannels channels, JSAny? v) {
  Future<JSAny?> run() async {
    final data = _fromJs(v);
    // Later, as fjs does: Dart may call back into JS (a builder), which must
    // not happen while JS is still in the middle of sending this.
    await Future<void>.microtask(() {});
    if (data is! Map<String, dynamic>) return null;
    final channel = data.remove('channel');
    if (channel is! String) return null;
    return _toJs(await channels.dispatch(channel, data));
  }

  return run().toJS;
}

/// A JS value as fjs gives it to Dart: objects are `Map<String, dynamic>`,
/// arrays `List<dynamic>`, integral numbers `int`, binary data `Uint8List`.
Object? _fromJs(JSAny? v) => _normalize(v.dartify());

Object? _normalize(Object? v) {
  if (v is Map) return <String, dynamic>{for (final e in v.entries) '${e.key}': _normalize(e.value)};
  if (v is List) return <dynamic>[for (final e in v) _normalize(e)];
  if (v is ByteBuffer) return v.asUint8List();
  if (v is TypedData && v is! Uint8List) return v.buffer.asUint8List(v.offsetInBytes, v.lengthInBytes);
  if (v is double && v == v.truncateToDouble() && v.isFinite) return v.toInt();
  return v;
}

/// A Dart value as fjs gives it to JS: binary data is an `ArrayBuffer`.
JSAny? _toJs(Object? v) => _bufferize(v).jsify();

Object? _bufferize(Object? v) {
  if (v is Map) return {for (final e in v.entries) e.key: _bufferize(e.value)};
  if (v is List) return [for (final e in v) _bufferize(e)];
  if (v is TypedData) {
    final whole = v.offsetInBytes == 0 && v.lengthInBytes == v.buffer.lengthInBytes;
    return whole ? v.buffer : Uint8List.fromList(v.buffer.asUint8List(v.offsetInBytes, v.lengthInBytes)).buffer;
  }
  return v;
}
