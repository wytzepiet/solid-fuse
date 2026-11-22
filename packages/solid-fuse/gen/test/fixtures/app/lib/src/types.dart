import 'package:flutter/foundation.dart';

@immutable
class Point {
  const Point(this.x, [this.y = 0]);
  final double x;
  final double y;
}

/// Recursive data.
class Chain {
  const Chain({this.next, this.value = 0});
  final Chain? next;
  final int value;
}

abstract class Shape {
  const Shape();
}

class Circle extends Shape {
  const Circle(this.radius);
  final double radius;
}

class Square extends Shape {
  const Square({required this.side});
  const Square.unit() : side = 1;
  final double side;
}

/// A namespace of constants.
abstract final class Palette {
  static const Point origin = Point(0, 0);
  static const Circle dot = Circle(1);
}

enum Mode { a, b, @Deprecated('use b') c }

/// Mutable, not @immutable: a handle.
class Mutable {
  int count = 0;
}

class Counter extends ChangeNotifier {
  Counter({this.start = 0});
  final int start;
}

class Secret {
  Secret._();
}
