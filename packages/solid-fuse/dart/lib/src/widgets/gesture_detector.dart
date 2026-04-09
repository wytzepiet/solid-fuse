import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../node.dart';

class FuseGestureDetector extends StatelessWidget {
  const FuseGestureDetector(this.node);

  final FuseNode node;

  // ── Serialization helpers ─────────────────────────────────────────────────

  static Map<String, double> _pos(Offset o) => {'x': o.dx, 'y': o.dy};
  static Map<String, double> _local(Offset o) => {'localX': o.dx, 'localY': o.dy};
  static Map<String, double> _vel(Velocity v) =>
      {'vx': v.pixelsPerSecond.dx, 'vy': v.pixelsPerSecond.dy};

  // ── Callback wrappers ─────────────────────────────────────────────────────

  // Tap down/up: { x, y, localX, localY, kind? }
  GestureTapDownCallback? _tapDown(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition), 'kind': d.kind?.name});
  }

  GestureTapUpCallback? _tapUp(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition), 'kind': d.kind.name});
  }

  // Long press down: { x, y, localX, localY, kind? }
  GestureLongPressDownCallback? _longPressDown(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition), 'kind': d.kind?.name});
  }

  // Long press start: { x, y, localX, localY }
  GestureLongPressStartCallback? _longPressStart(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition)});
  }

  // Long press move update: { x, y, localX, localY, offsetX, offsetY }
  GestureLongPressMoveUpdateCallback? _longPressMoveUpdate(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({
      ..._pos(d.globalPosition), ..._local(d.localPosition),
      'offsetX': d.offsetFromOrigin.dx, 'offsetY': d.offsetFromOrigin.dy,
    });
  }

  // Long press end: { x, y, localX, localY, vx, vy }
  GestureLongPressEndCallback? _longPressEnd(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition), ..._vel(d.velocity)});
  }

  // Drag down: { x, y, localX, localY }
  GestureDragDownCallback? _dragDown(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition)});
  }

  // Drag start: { x, y, localX, localY, kind? }
  GestureDragStartCallback? _dragStart(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._pos(d.globalPosition), ..._local(d.localPosition), 'kind': d.kind?.name});
  }

  // Drag update: { x, y, localX, localY, dx, dy, primaryDelta? }
  GestureDragUpdateCallback? _dragUpdate(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({
      ..._pos(d.globalPosition), ..._local(d.localPosition),
      'dx': d.delta.dx, 'dy': d.delta.dy,
      'primaryDelta': d.primaryDelta,
    });
  }

  // Drag end: { x, y, localX, localY, vx, vy, primaryVelocity? }
  GestureDragEndCallback? _dragEnd(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({
      ..._pos(d.globalPosition), ..._local(d.localPosition),
      ..._vel(d.velocity),
      'primaryVelocity': d.primaryVelocity,
    });
  }

  // Scale start: { x, y, localX, localY, pointerCount, kind? }
  GestureScaleStartCallback? _scaleStart(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({
      ..._pos(d.focalPoint), ..._local(d.localFocalPoint),
      'pointerCount': d.pointerCount, 'kind': d.kind?.name,
    });
  }

  // Scale update: { x, y, localX, localY, scale, horizontalScale, verticalScale, rotation, pointerCount, dx, dy }
  GestureScaleUpdateCallback? _scaleUpdate(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({
      ..._pos(d.focalPoint), ..._local(d.localFocalPoint),
      'scale': d.scale, 'horizontalScale': d.horizontalScale,
      'verticalScale': d.verticalScale, 'rotation': d.rotation,
      'pointerCount': d.pointerCount,
      'dx': d.focalPointDelta.dx, 'dy': d.focalPointDelta.dy,
    });
  }

  // Scale end: { vx, vy, scaleVelocity, pointerCount }
  GestureScaleEndCallback? _scaleEnd(String name) {
    final fn = node.function(name);
    if (fn == null) return null;
    return (d) => fn({..._vel(d.velocity), 'scaleVelocity': d.scaleVelocity, 'pointerCount': d.pointerCount});
  }

  // ── Config parsing ────────────────────────────────────────────────────────

  HitTestBehavior? _parseBehavior() {
    return switch (node.string('behavior')) {
      'opaque' => HitTestBehavior.opaque,
      'translucent' => HitTestBehavior.translucent,
      'deferToChild' => HitTestBehavior.deferToChild,
      _ => null,
    };
  }

  DragStartBehavior _parseDragStartBehavior() {
    return switch (node.string('dragStartBehavior')) {
      'down' => DragStartBehavior.down,
      _ => DragStartBehavior.start,
    };
  }

  Set<PointerDeviceKind>? _parseSupportedDevices() {
    final list = node.list<String>('supportedDevices');
    if (list == null) return null;
    return list.map((s) => switch (s) {
      'touch' => PointerDeviceKind.touch,
      'mouse' => PointerDeviceKind.mouse,
      'stylus' => PointerDeviceKind.stylus,
      'trackpad' => PointerDeviceKind.trackpad,
      _ => PointerDeviceKind.touch,
    }).toSet();
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Tap
      onTapDown: _tapDown('onTapDown'),
      onTapUp: _tapUp('onTapUp'),
      onTap: node.function('onTap'),
      onTapCancel: node.function('onTapCancel'),
      // Secondary tap (right-click)
      onSecondaryTap: node.function('onSecondaryTap'),
      onSecondaryTapDown: _tapDown('onSecondaryTapDown'),
      onSecondaryTapUp: _tapUp('onSecondaryTapUp'),
      onSecondaryTapCancel: node.function('onSecondaryTapCancel'),
      // Tertiary tap (middle-click)
      onTertiaryTapDown: _tapDown('onTertiaryTapDown'),
      onTertiaryTapUp: _tapUp('onTertiaryTapUp'),
      onTertiaryTapCancel: node.function('onTertiaryTapCancel'),
      // Double tap
      onDoubleTapDown: _tapDown('onDoubleTapDown'),
      onDoubleTap: node.function('onDoubleTap'),
      onDoubleTapCancel: node.function('onDoubleTapCancel'),
      // Long press
      onLongPressDown: _longPressDown('onLongPressDown'),
      onLongPressCancel: node.function('onLongPressCancel'),
      onLongPress: node.function('onLongPress'),
      onLongPressStart: _longPressStart('onLongPressStart'),
      onLongPressMoveUpdate: _longPressMoveUpdate('onLongPressMoveUpdate'),
      onLongPressUp: node.function('onLongPressUp'),
      onLongPressEnd: _longPressEnd('onLongPressEnd'),
      // Secondary long press
      onSecondaryLongPressDown: _longPressDown('onSecondaryLongPressDown'),
      onSecondaryLongPressCancel: node.function('onSecondaryLongPressCancel'),
      onSecondaryLongPress: node.function('onSecondaryLongPress'),
      onSecondaryLongPressStart: _longPressStart('onSecondaryLongPressStart'),
      onSecondaryLongPressMoveUpdate: _longPressMoveUpdate('onSecondaryLongPressMoveUpdate'),
      onSecondaryLongPressUp: node.function('onSecondaryLongPressUp'),
      onSecondaryLongPressEnd: _longPressEnd('onSecondaryLongPressEnd'),
      // Tertiary long press
      onTertiaryLongPressDown: _longPressDown('onTertiaryLongPressDown'),
      onTertiaryLongPressCancel: node.function('onTertiaryLongPressCancel'),
      onTertiaryLongPress: node.function('onTertiaryLongPress'),
      onTertiaryLongPressStart: _longPressStart('onTertiaryLongPressStart'),
      onTertiaryLongPressMoveUpdate: _longPressMoveUpdate('onTertiaryLongPressMoveUpdate'),
      onTertiaryLongPressUp: node.function('onTertiaryLongPressUp'),
      onTertiaryLongPressEnd: _longPressEnd('onTertiaryLongPressEnd'),
      // Vertical drag
      onVerticalDragDown: _dragDown('onVerticalDragDown'),
      onVerticalDragStart: _dragStart('onVerticalDragStart'),
      onVerticalDragUpdate: _dragUpdate('onVerticalDragUpdate'),
      onVerticalDragEnd: _dragEnd('onVerticalDragEnd'),
      onVerticalDragCancel: node.function('onVerticalDragCancel'),
      // Horizontal drag
      onHorizontalDragDown: _dragDown('onHorizontalDragDown'),
      onHorizontalDragStart: _dragStart('onHorizontalDragStart'),
      onHorizontalDragUpdate: _dragUpdate('onHorizontalDragUpdate'),
      onHorizontalDragEnd: _dragEnd('onHorizontalDragEnd'),
      onHorizontalDragCancel: node.function('onHorizontalDragCancel'),
      // Pan
      onPanDown: _dragDown('onPanDown'),
      onPanStart: _dragStart('onPanStart'),
      onPanUpdate: _dragUpdate('onPanUpdate'),
      onPanEnd: _dragEnd('onPanEnd'),
      onPanCancel: node.function('onPanCancel'),
      // Scale
      onScaleStart: _scaleStart('onScaleStart'),
      onScaleUpdate: _scaleUpdate('onScaleUpdate'),
      onScaleEnd: _scaleEnd('onScaleEnd'),
      // Config
      behavior: _parseBehavior(),
      excludeFromSemantics: node.bool('excludeFromSemantics') ?? false,
      dragStartBehavior: _parseDragStartBehavior(),
      trackpadScrollCausesScale: node.bool('trackpadScrollCausesScale') ?? false,
      trackpadScrollToScaleFactor: node.offset('trackpadScrollToScaleFactor') ?? kDefaultTrackpadScrollToScaleFactor,
      supportedDevices: _parseSupportedDevices(),
      child: node.buildLayout(),
    );
  }
}
