// Flutter's value types, as the app's generated `#fuse/flutter` declares
// them. Core widgets take these, so a `Color` or an `EdgeInsets` built for a
// generated widget fits a `View` too. Types only: nothing is imported at
// runtime, and `dist/*.d.ts` keep `import("#fuse/flutter")` for the app to
// resolve.
export type {
  AlignmentGeometry,
  BoxDecoration,
  Color,
  EdgeInsetsGeometry,
  FontWeight,
  Shadow,
  TextDecoration,
  TextStyle,
} from "#fuse/flutter";
