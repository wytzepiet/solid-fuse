import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'channels.dart';

/// Manages WebSocket connections on behalf of the JS runtime.
///
/// JS sends ws ops via channels ('_ws' channel).
/// Dart pushes events back via channels ('_wsEvent' channel).
class FuseWsManager {
  FuseWsManager({required this.channels});

  final FuseChannels channels;
  final _connections = <int, WebSocketChannel>{};

  Future<void> handleBridgeCall(Map<String, dynamic> data) async {
    final op = data['op'] as String;
    final id = data['id'] as int;

    switch (op) {
      case 'open':
        _open(
          id,
          data['url'] as String,
          (data['protocols'] as List?)?.cast<String>() ?? [],
        );
      case 'send':
        _connections[id]?.sink.add(data['data']);
      case 'close':
        final channel = _connections[id];
        if (channel != null) {
          await channel.sink.close(
            data['code'] as int? ?? 1000,
            data['reason'] as String? ?? '',
          );
        }
    }
  }

  void _open(int id, String url, List<String> protocols) {
    final channel = WebSocketChannel.connect(
      Uri.parse(url),
      protocols: protocols.isNotEmpty ? protocols : null,
    );
    _connections[id] = channel;

    channel.ready.then((_) {
      _dispatchEvent(id, 'open', {'protocol': channel.protocol ?? ''});
    }).catchError((e) {
      _dispatchEvent(id, 'error', {'message': e.toString()});
    });

    channel.stream.listen(
      (message) {
        _dispatchEvent(id, 'message', {'data': message});
      },
      onError: (e) {
        _dispatchEvent(id, 'error', {'message': e.toString()});
      },
      onDone: () {
        _dispatchEvent(id, 'close', {
          'code': channel.closeCode ?? 1000,
          'reason': channel.closeReason ?? '',
          'wasClean': true,
        });
        _connections.remove(id);
      },
    );
  }

  Future<void> _dispatchEvent(
    int id,
    String type,
    Map<String, dynamic> data,
  ) async {
    try {
      await channels.send('_wsEvent', {
        'id': id,
        'type': type,
        ...data,
      });
    } catch (e) {
      debugPrint('[Fuse] WS dispatch error: $e');
    }
  }

  void dispose() {
    for (final channel in _connections.values) {
      channel.sink.close();
    }
    _connections.clear();
  }
}
