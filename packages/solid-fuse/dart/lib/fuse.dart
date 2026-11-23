/// What solid_fuse itself offers to `fuse gen`: the shorthands
/// (`padding={8}`, `color="#ff8800"`, ...) and the Flutter widgets its own
/// components render through their generated adapters (`Icon`), and what
/// core's props and docs point to in `#fuse/flutter`: `createFocusNode`,
/// `createScrollController` (the types of `focusNode` and `controller` are
/// read off EditableText and SingleChildScrollView) and `GestureDetector`,
/// and the value types core's props take.
/// A release build keeps only what the app uses. Every
/// package can ship a `lib/fuse.dart` like this one; the app's own says what
/// of its Dart, and of the packages it uses, crosses to JS.
library;

export 'package:flutter/widgets.dart'
    show Icon, EditableText, SingleChildScrollView, GestureDetector, FocusNode, ScrollController,
        // Value types core's props take; named here, so hand-written Dart
        // decodes them (`node.value<Color>('color')`).
        Color, EdgeInsetsGeometry, AlignmentGeometry, BoxDecoration, TextStyle, FontWeight, Shadow,
        TextDecoration;

export 'shorthands.dart';
