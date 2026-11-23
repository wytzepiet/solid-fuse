// @solid-fuse/cupertino: iOS design as Solid components, thin layers over
// the generated `#fuse/cupertino_ui` (which has all of it, for what these
// leave out).
export { CupertinoApp, type CupertinoAppProps, type CupertinoTheme, type BriefCupertinoTheme } from "./app";
export { cupertinoPage, type CupertinoPageProps } from "./page";
export { PageScaffold, NavigationBar, type PageScaffoldProps, type NavigationBarProps } from "./scaffold";
export {
  Button, Switch, Checkbox, Radio, Slider, ActivityIndicator, SegmentedControl,
  type ButtonProps, type SwitchProps, type CheckboxProps, type RadioProps, type SliderProps,
  type ActivityIndicatorProps, type SegmentedControlProps,
} from "./controls";
export { ListSection, ListTile, type ListSectionProps, type ListTileProps } from "./list";
export { TextField, type TextFieldProps } from "./text-field";
export {
  Dialog, DialogAction, ActionSheet, ActionSheetAction,
  type DialogProps, type DialogActionProps, type ActionSheetProps, type ActionSheetActionProps,
} from "./overlays";
export type { Label, IconSlot } from "./slots";
export * as CupertinoIcons from "#fuse/cupertino_ui/CupertinoIcons";
export * as CupertinoColors from "#fuse/cupertino_ui/CupertinoColors";
