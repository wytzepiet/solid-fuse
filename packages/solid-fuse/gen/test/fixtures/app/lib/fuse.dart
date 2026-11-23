// The fixture's barrel: what of its own Dart crosses to JS. fixture.dart is
// listed in the tests' config instead (one example of every rule).
export 'src/annotated.dart' show Badge, Tally, pointSquare, pointAt, sizeSquare;
// Another package's class, by name: joins that library's rule.
export 'package:flutter/widgets.dart' show Center;
