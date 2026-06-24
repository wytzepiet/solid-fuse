import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:heroine/heroine.dart';
import 'package:motor/motor.dart';
import 'package:solid_fuse/solid_fuse.dart';

import '../motion.dart';

/// A navigator page whose route blurs + zooms the page behind while the new
/// page springs in, and (being a [HeroinePageRouteMixin] route) drives any
/// `<Heroine>` flights and drag-to-dismiss inside it. Ported from the old app's
/// BlurryPageRoute, minus the app-specific depth/RouteId/theme plumbing.
class FuseHeroinePage extends FusePageHandle {
  FuseHeroinePage(super.node);

  @override
  late final Page<dynamic> object = _HeroinePage(
    key: pageKey,
    name: node.string('name'),
    inZoom: node.double('inZoom') ?? 0.8,
    outZoom: node.double('outZoom') ?? 0.9,
    backgroundColor: node.color('backgroundColor') ?? const Color(0xFF000000),
    motion: parseMotion(
      node.map('motion'),
      fallback: const CupertinoMotion(
        duration: Duration(milliseconds: 400),
        bounce: 0.2,
      ),
    ),
    transitionDuration:
        Duration(milliseconds: node.int('transitionDurationMs') ?? 400),
    child: pageContent,
  );
}

class _HeroinePage extends Page<dynamic> {
  const _HeroinePage({
    super.key,
    super.name,
    required this.child,
    required this.inZoom,
    required this.outZoom,
    required this.backgroundColor,
    required this.motion,
    required this.transitionDuration,
  });

  final Widget child;
  final double inZoom;
  final double outZoom;
  final Color backgroundColor;
  final Motion motion;
  final Duration transitionDuration;

  @override
  Route<dynamic> createRoute(BuildContext context) {
    return _HeroineRoute<dynamic>(
      settings: this,
      transitionDuration: transitionDuration,
      reverseTransitionDuration: transitionDuration,
      pageBuilder: (context, animation, secondaryAnimation) => child,
      transitionsBuilder: (context, animation, secondaryAnimation, c) =>
          _blurryTransition(
        animation: animation,
        secondaryAnimation: secondaryAnimation,
        inZoom: inZoom,
        outZoom: outZoom,
        backgroundColor: backgroundColor,
        motion: motion,
        child: c,
      ),
    );
  }
}

/// PageRouteBuilder + HeroinePageRouteMixin — the mixin is what makes
/// `HeroinePageRoute.maybeOf(context)` / dismiss-react / hero flights work, and
/// forces opaque=false so the blurred page below shows through.
class _HeroineRoute<T> extends PageRouteBuilder<T> with HeroinePageRouteMixin<T> {
  _HeroineRoute({
    super.settings,
    required super.pageBuilder,
    required super.transitionsBuilder,
    super.transitionDuration,
    super.reverseTransitionDuration,
  });
}

Widget _blurryTransition({
  required Animation<double> animation,
  required Animation<double> secondaryAnimation,
  required double inZoom,
  required double outZoom,
  required Color backgroundColor,
  required Motion motion,
  required Widget child,
}) {
  final value = animation.isForwardOrCompleted ? 1.0 : 0.0;
  final secondaryValue = secondaryAnimation.isForwardOrCompleted ? 1.0 : 0.0;

  return SingleMotionBuilder(
    value: secondaryValue,
    motion: motion,
    from: 0.0,
    builder: (context, v, child) => Transform.scale(
      scale: Tween(begin: 1.0, end: outZoom).transform(v),
      child: child,
    ),
    child: SingleMotionBuilder(
      motion: motion,
      value: value,
      from: 0.0,
      builder: (context, v, child) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: v * 20, sigmaY: v * 20),
        child: Opacity(
          opacity: v.clamp(0.0, 1.0),
          child: ReactToHeroineDismiss(
            builder: (context, progress, offset, child) => Container(
              alignment: Alignment.center,
              color: backgroundColor.withValues(
                alpha: (1 - (progress * 0.4)) * backgroundColor.a,
              ),
              child: child,
            ),
            child: Transform.scale(
              scale: Tween(begin: inZoom, end: 1.0).transform(v),
              child: child,
            ),
          ),
        ),
      ),
      child: IgnorePointer(ignoring: value < 0.8, child: child),
    ),
  );
}
