// Shared input and primitive types used across widgets.
// Widget-specific prop types live alongside their components in `./widgets/`.

// Values core widgets take (colors, insets, decorations, text styles) are
// Flutter's, from the app's generated `#fuse/flutter`: the same types every
// generated widget takes, with the same short forms. See `flutter.ts`.

export type TransformInput = {
  rotate?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
};

/** How an element lays out several children: a column unless it says otherwise. */
export type LayoutInput = {
  direction?: "horizontal" | "vertical";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly";
  expand?: boolean;
};

// Base props every widget accepts.
export interface BaseProps {
  children?: JSX.Element;
  /**
   * Inside a parent's layout, this element's share of the free space along
   * the main axis, like CSS `flex: 1` or Flutter's `Expanded(flex: 1)`.
   */
  flex?: number;
  ref?: import("./renderer").FuseNode | ((el: import("./renderer").FuseNode) => void);
}

// Handles core widgets take come from the app's generated Flutter layer, so
// there is one FocusNode and one ScrollController: the generated ones, with
// everything Flutter's have. Types only; nothing is imported at runtime.
/** What a `focusNode` prop takes: `createFocusNode()` from `#fuse/flutter`. */
export type FocusNodeInput = NonNullable<import("#fuse/flutter").EditableTextProps["focusNode"]>;
/** What a scroll `controller` prop takes: `createScrollController()` and friends from `#fuse/flutter`. */
export type ScrollControllerInput = NonNullable<import("#fuse/flutter").SingleChildScrollViewProps["controller"]>;
