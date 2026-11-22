// Annotations `fuse gen` reads (solid_fuse_gen). They do nothing at runtime.

/// Exports a class of the app's own Dart to JS: a widget becomes a component,
/// a handle (a Listenable, or a class with mutable state) gets `createX`.
///
/// ```dart
/// @fuse
/// class Badge extends StatelessWidget { ... }
/// ```
///
/// Only the app's own `lib/` is searched; other packages are listed in
/// `fuse.config.ts` (`gen.libraries`).
const fuse = Fuse();

class Fuse {
  const Fuse();
}

/// Makes a function a short way to write its return type from JS: wherever
/// a prop takes that type (or a supertype), a value of the parameter's type
/// works too, and Dart calls the function to turn it into the real thing.
///
/// ```dart
/// @fuseShorthand
/// EdgeInsets edgeInsetsAll(double value) => EdgeInsets.all(value);
/// // <Padding padding={8}>
/// ```
///
/// The parameter is a `bool`, a number, a `String` or a `List`, and one
/// type has at most one shorthand of each. [ts] narrows the TypeScript type
/// (a String one could be r'`#${string}`').
const fuseShorthand = FuseShorthand();

class FuseShorthand {
  const FuseShorthand({this.ts});

  /// TypeScript type of the short form; default: the parameter's type.
  final String? ts;
}
