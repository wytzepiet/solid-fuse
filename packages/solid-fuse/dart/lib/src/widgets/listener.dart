import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../node.dart';

class FuseListener extends StatelessWidget {
  const FuseListener(this.node);

  final FuseNode node;

  // ── Serialization helpers ─────────────────────────────────────────────────

  static Map<String, double> _pos(Offset o) => {'x': o.dx, 'y': o.dy};
  static Map<String, double> _local(Offset o) => {'localX': o.dx, 'localY': o.dy};

  // Down/move/up/hover/cancel: { x, y, localX, localY, dx, dy, kind, buttons,
  // pointer, pressure }. `delta` lives on PointerEvent, so it's zero on down/up.
  Map<String, dynamic> _base(PointerEvent e) => {
    ..._pos(e.position),
    ..._local(e.localPosition),
    'dx': e.delta.dx,
    'dy': e.delta.dy,
    'kind': e.kind.name,
    'buttons': e.buttons,
    'pointer': e.pointer,
    'pressure': e.pressure,
  };

  void Function(PointerDownEvent)? _down(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn(_base(e));
  }

  void Function(PointerMoveEvent)? _move(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn(_base(e));
  }

  void Function(PointerUpEvent)? _up(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn(_base(e));
  }

  void Function(PointerHoverEvent)? _hover(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn(_base(e));
  }

  void Function(PointerCancelEvent)? _cancel(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn(_base(e));
  }

  // Signal: { x, y, localX, localY, kind, scrollDeltaX, scrollDeltaY }.
  void Function(PointerSignalEvent)? _signal(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) {
      final scroll = e is PointerScrollEvent ? e.scrollDelta : Offset.zero;
      fn({
        ..._pos(e.position),
        ..._local(e.localPosition),
        'kind': e.kind.name,
        'scrollDeltaX': scroll.dx,
        'scrollDeltaY': scroll.dy,
      });
    };
  }

  void Function(PointerPanZoomStartEvent)? _panZoomStart(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn({
      ..._pos(e.position),
      ..._local(e.localPosition),
      'kind': e.kind.name,
      'pointer': e.pointer,
    });
  }

  void Function(PointerPanZoomUpdateEvent)? _panZoomUpdate(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn({
      ..._pos(e.position),
      ..._local(e.localPosition),
      'panX': e.pan.dx,
      'panY': e.pan.dy,
      'panDeltaX': e.panDelta.dx,
      'panDeltaY': e.panDelta.dy,
      'scale': e.scale,
      'rotation': e.rotation,
    });
  }

  void Function(PointerPanZoomEndEvent)? _panZoomEnd(String name) {
    final fn = node.callback(name);
    if (fn == null) return null;
    return (e) => fn({..._pos(e.position), ..._local(e.localPosition)});
  }

  HitTestBehavior _parseBehavior() {
    return switch (node.string('behavior')) {
      'opaque' => HitTestBehavior.opaque,
      'translucent' => HitTestBehavior.translucent,
      _ => HitTestBehavior.deferToChild,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: _down('onPointerDown'),
      onPointerMove: _move('onPointerMove'),
      onPointerUp: _up('onPointerUp'),
      onPointerHover: _hover('onPointerHover'),
      onPointerCancel: _cancel('onPointerCancel'),
      onPointerSignal: _signal('onPointerSignal'),
      onPointerPanZoomStart: _panZoomStart('onPointerPanZoomStart'),
      onPointerPanZoomUpdate: _panZoomUpdate('onPointerPanZoomUpdate'),
      onPointerPanZoomEnd: _panZoomEnd('onPointerPanZoomEnd'),
      behavior: _parseBehavior(),
      child: node.flexChildren,
    );
  }
}
