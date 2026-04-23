import "./polyfills";

export {
  render,
  effect,
  memo,
  createComponent,
  createElement,
  createTextNode,
  insertNode,
  insert,
  spread,
  setProp,
  mergeProps,
  flush,
  flushOps,
  For,
  Show,
  Switch,
  Match,
} from "./renderer";
export type { FuseNode } from "./renderer";
export {
  createNavigationController,
  Navigator,
  useNavigation,
  type NavigationController,
  type PageConfig,
  type PageEntry,
} from "./navigator";
export { materialPage, type MaterialPageProps } from "./pages/material";
export { Dynamic, createDynamic } from "./dynamic";
export { View, type ViewProps } from "./widgets/view";
export { Text, type TextProps } from "./widgets/text";
export { Icon, type IconProps, type IconData } from "./widgets/icon";
export { GestureDetector, type GestureDetectorProps } from "./widgets/gesture-detector";
export { ScrollView, type ScrollViewProps } from "./widgets/scroll-view";
export { Stack, type StackProps } from "./widgets/stack";
export { Positioned, type PositionedProps } from "./widgets/positioned";
export {
  TextField,
  type TextFieldProps,
  type TextFieldDecoration,
  type KeyboardType,
  type TextInputAction,
  type TextFieldBorderStyle,
  type TextCapitalization,
  type FloatingLabelBehavior,
} from "./widgets/text-field";
export { createHandle } from "./handle";
export type { Handle, HandleRuntime } from "./handle";
export { createScrollController } from "./scroll-controller";
export type { ScrollController } from "./scroll-controller";
export { createFocusNode } from "./focus-node";
export type { FocusNode } from "./focus-node";
export { on, send, channels } from "./channels";
export { defineConfig } from "./config";
export type { FuseConfig } from "./config";
export type * from "./types";
