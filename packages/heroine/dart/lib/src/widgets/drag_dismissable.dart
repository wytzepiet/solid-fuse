import 'package:flutter/material.dart';
import 'package:heroine/heroine.dart';
import 'package:motor/motor.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '../motion.dart';

/// Lets its child be dragged to dismiss. Wrapping a `<Heroine>` also feeds the
/// gesture velocity into the flight spring.
///
/// Two modes:
/// - Default: the `heroine` package's [DragDismissable] — a free drag on the
///   given axes.
/// - With a `scrollController`: a nested-scroll-aware dismiss — a downward swipe
///   only starts a dismiss when the scrollable is at the top, so it coexists
///   with vertical scrolling.
///
/// With an `onDismiss` callback set, the route is NOT auto-popped; otherwise it
/// pops the current route.
class FuseDragDismissable extends StatelessWidget {
  const FuseDragDismissable(this.node, {super.key});

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final axisAffinity = switch (node.string('axisAffinity')) {
      'horizontal' => Axis.horizontal,
      'vertical' => Axis.vertical,
      _ => null,
    };
    final threshold = node.double('threshold') ?? 140;
    final velocityThreshold = node.double('velocityThreshold') ?? 1000;
    final constrainToAxis = node.bool('constrainToAxis') ?? true;
    final motion = parseMotion(
      node.map('motion'),
      fallback: const CupertinoMotion.interactive(),
    );
    final onDismiss = node.callback('onDismiss');
    final child = node.flexChildren;

    // Nested-scroll mode: a downward swipe at scroll-top dismisses, otherwise
    // the gesture is left to the scrollable.
    final scrollController = node.handle<ScrollController>('scrollController');
    if (scrollController != null) {
      return _NestedScrollDragDismissable(
        scrollController: scrollController,
        threshold: threshold,
        velocityThreshold: velocityThreshold,
        motion: motion,
        onDismiss: onDismiss,
        child: child,
      );
    }

    if (onDismiss != null) {
      return DragDismissable.custom(
        onDismiss: onDismiss,
        threshold: threshold,
        velocityThreshold: velocityThreshold,
        axisAffinity: axisAffinity,
        constrainToAxis: constrainToAxis,
        motion: motion,
        child: child,
      );
    }
    return DragDismissable(
      threshold: threshold,
      velocityThreshold: velocityThreshold,
      axisAffinity: axisAffinity,
      constrainToAxis: constrainToAxis,
      motion: motion,
      child: child,
    );
  }
}

/// Downward-swipe-to-dismiss that cooperates with a [ScrollController]: a drag
/// only becomes a dismiss when the list is scrolled to the top and the gesture
/// pulls down. The drag scales by 0.8 for a rubber-band feel and hands its
/// velocity to the heroine flight via [HeroineVelocity]. The snap-back spring is
/// expressed with motor's [MotionBuilder] (consistent with the rest of the
/// package). Only meaningful inside a [HeroinePageRouteMixin] route.
class _NestedScrollDragDismissable extends StatefulWidget {
  const _NestedScrollDragDismissable({
    required this.scrollController,
    required this.child,
    required this.threshold,
    required this.velocityThreshold,
    required this.motion,
    required this.onDismiss,
  });

  final ScrollController scrollController;
  final Widget child;
  final double threshold;
  final double velocityThreshold;
  final Motion motion;
  final VoidCallback? onDismiss;

  @override
  State<_NestedScrollDragDismissable> createState() =>
      _NestedScrollDragDismissableState();
}

class _NestedScrollDragDismissableState
    extends State<_NestedScrollDragDismissable> {
  Offset? _dragStartOffset;
  Offset _offset = Offset.zero;
  Velocity _velocity = Velocity.zero;
  Velocity _previousVelocity = Velocity.zero;
  bool _dragStarted = false;
  bool _gestureActive = false;
  Offset _dragStartPosition = Offset.zero;
  Duration _previousTimestamp = Duration.zero;

  // Balance didStartUserGesture/didStopUserGesture — Flutter asserts if Stop is
  // called without a matching Start (or twice).
  void _stopGesture() {
    if (!_gestureActive) return;
    Navigator.of(context).didStopUserGesture();
    _gestureActive = false;
  }

  VoidCallback get _dismiss =>
      widget.onDismiss ?? () => Navigator.maybePop(context);

  double get _progress => (_offset.distance / widget.threshold).clamp(0, 1);

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (event) {
        _dragStarted = false;
        _dragStartPosition = event.position;
      },
      onPointerMove: (event) {
        final position = event.position;
        final scrollAtTop = widget.scrollController.offset <= 0;

        // Start a dismiss only at the top, on a downward-dominant pull.
        if (!_dragStarted &&
            scrollAtTop &&
            position.dy > _dragStartPosition.dy &&
            position.dy - _dragStartPosition.dy >
                (position.dx - _dragStartPosition.dx).abs()) {
          _dragStarted = true;
          _dragStartPosition = position;
          _start(event.position);
        }

        // Pulled back up past the start — hand the gesture back to the scroller.
        if (_dragStarted && position.dy < _dragStartPosition.dy) {
          _dragStarted = false;
          _cancel();
        }

        if (_dragStarted && position.dy > _dragStartPosition.dy) {
          widget.scrollController.jumpTo(0);

          final secondsPassed =
              (event.timeStamp - _previousTimestamp).inMicroseconds / 1000000;
          _previousVelocity = _velocity;
          if (secondsPassed > 0) {
            _velocity = Velocity(pixelsPerSecond: event.delta / secondsPassed);
          }
          _previousTimestamp = event.timeStamp;

          final diff = position - _dragStartPosition;
          _update(_dragStartPosition + diff * 0.8);
        }
      },
      onPointerUp: (event) {
        if (_dragStarted) _end(_previousVelocity);
      },
      child: MotionBuilder<Offset>(
        active: _dragStartOffset == null,
        value: _offset,
        motion: widget.motion,
        converter: MotionConverter.offset,
        builder: (context, value, child) =>
            Transform.translate(offset: value, child: child),
        child: HeroineVelocity(velocity: _velocity, child: widget.child),
      ),
    );
  }

  void _start(Offset globalPosition) {
    if (!_gestureActive) {
      Navigator.of(context).didStartUserGesture();
      _gestureActive = true;
    }
    HeroinePageRoute.maybeOf<dynamic>(context)?.updateDismiss(0, Offset.zero);
    setState(() => _dragStartOffset = globalPosition);
  }

  void _update(Offset globalPosition) {
    final startOffset = _dragStartOffset;
    if (startOffset == null) return;
    _offset = globalPosition - startOffset;
    HeroinePageRoute.maybeOf<dynamic>(context)
        ?.updateDismiss(_progress, _offset);
    setState(() {});
  }

  void _cancel() {
    _stopGesture();
    HeroinePageRoute.maybeOf<dynamic>(context)?.cancelDismiss();
    setState(() {
      _dragStartOffset = null;
      _offset = Offset.zero;
    });
  }

  void _end(Velocity velocity) {
    final shouldDismiss = _progress >= 1 ||
        velocity.pixelsPerSecond.distance > widget.velocityThreshold;
    // Respect a route that refuses to pop (auto-pop mode only).
    final blocked = widget.onDismiss == null &&
        ModalRoute.of(context)?.popDisposition == RoutePopDisposition.doNotPop;
    if (!shouldDismiss || blocked) {
      _cancel();
      return;
    }
    _stopGesture();
    setState(() {
      _velocity = velocity; // hand the gesture velocity to the heroine flight
      _dragStartOffset = null;
    });
    // Pop OUTSIDE setState so the route's node disposal doesn't run mid-build.
    _dismiss();
  }
}
