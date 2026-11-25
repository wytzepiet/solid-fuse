import "./polyfills";
import "./frames";

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
  ref,
  applyRef,
  template,
  instantiate,
  flush,
  flushOps,
  For,
  Show,
  Switch,
  Match,
  Errored,
  Loading,
  Repeat,
  Reveal,
} from "./renderer";
export { FuseNode } from "./renderer";
export {
  Navigator,
  Tabs,
  createStack,
  useNav,
  usePage,
  saveNavigation,
  type MountedStack,
  type Nav,
  type Page,
  type PageConfig,
  type PageEntry,
  type PushOptions,
  type SavedEntry,
  type SavedHolder,
  type StackHandle,
} from "./navigator";
export {
  route,
  addressOf,
  matchAddress,
  type Route,
  type RouteOptions,
  type PageType,
  type PathParams,
  type ParseParams,
  type Register,
  type Address,
} from "./routes";
export {
  page,
  PageTypeContext,
  usePageType,
  transitionProp,
  type PageProps,
  type PageFactory,
  type Transition,
  type RouteAnimations,
} from "./pages/page";
export { Dynamic, createDynamic } from "./dynamic";
export { View, type ViewProps } from "./widgets/view";
export { Text, type TextProps } from "./widgets/text";
export { Icon, type IconProps, type IconData } from "./widgets/icon";
export { ScrollView, type ScrollViewProps } from "./widgets/scroll-view";
export { Stack, type StackProps } from "./widgets/stack";
export { Positioned, type PositionedProps } from "./widgets/positioned";
export { App, type AppProps } from "./widgets/app";
export { Pressable, type PressableProps, type PressState } from "./widgets/pressable";
export {
  TextInput,
  type TextInputProps,
  type TextInputBaseProps,
  type KeyboardType,
  type TextInputAction,
  type TextCapitalization,
} from "./widgets/text-input";
export { Modal, type ModalProps } from "./widgets/modal";
export { RadioGroup, type RadioGroupProps } from "./widgets/radio-group";
export { Tooltip, type TooltipProps } from "./widgets/tooltip";
export { Menu, type MenuProps } from "./widgets/menu";
export { Expandable, type ExpandableProps } from "./widgets/expandable";
export { createHandle } from "./handle";
export { fake, type FakeOf } from "./fake";
export type { Handle, HandleRuntime } from "./handle";
export { on, send, call, channels } from "./channels";
export { host } from "./host";
export type { Host, Brightness, Platform, BuildMode, ViewSize, ViewEdges } from "./host";
export { defineConfig } from "./config";
export type { FuseConfig } from "./config";
export type * from "./types";
export {
  createMotion,
  createSpring,
  createElapsed,
  spring,
  springCoefficients,
  smooth,
  snappy,
  bouncy,
  lerp,
  lerpColor,
  type Step,
  type MotionState,
  type MotionSetter,
  type MotionSetOptions,
  type MotionOptions,
  type SpringConfig,
  type LerpableColor,
} from "./animation";
