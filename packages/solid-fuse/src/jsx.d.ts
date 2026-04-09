import type {
  ViewProps,
  TextProps,
  GestureDetectorProps,
  NavigatorProps,
  MaterialPageProps,
  ScrollViewProps,
  StackProps,
  PositionedProps,
} from "./types";

declare global {
  namespace JSX {
    // Must be `any` so that our FuseNode elements are assignable to
    // third-party Solid components' props (typed as solid-js's JSX.Element,
    // which includes DOM Node). The renderer handles real types at runtime.
    type Element = any;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      view: ViewProps;
      text: TextProps;
      gestureDetector: GestureDetectorProps;
      navigator: NavigatorProps;
      materialPage: MaterialPageProps;
      scrollView: ScrollViewProps;
      stack: StackProps;
      positioned: PositionedProps;
    }
  }
}
