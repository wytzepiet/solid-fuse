// @solid-fuse/material: Material Design as Solid components, thin layers
// over the generated `#fuse/material_ui` (which has all of it, for what
// these leave out).
export { MaterialApp, type MaterialAppProps, type MaterialTheme, type BriefTheme } from "./app";
export { materialPage, type MaterialPageProps } from "./page";
export { Scaffold, AppBar, type ScaffoldProps, type AppBarProps } from "./scaffold";
export {
  Button, IconButton, FloatingActionButton,
  type ButtonProps, type ButtonVariant, type IconButtonProps, type FloatingActionButtonProps,
} from "./buttons";
export {
  Switch, Checkbox, Radio, Slider,
  type SwitchProps, type CheckboxProps, type RadioProps, type SliderProps,
} from "./controls";
export { TextField, type TextFieldProps } from "./text-field";
export {
  Card, ListTile, Divider, Chip, Badge, ProgressIndicator,
  type CardProps, type ListTileProps, type DividerProps, type ChipProps, type BadgeProps, type ProgressIndicatorProps,
} from "./content";
export { NavigationBar, NavigationDestination, type NavigationBarProps, type NavigationDestinationProps } from "./navigation";
export { Dialog, BottomSheet, type DialogProps, type BottomSheetProps } from "./overlays";
export type { Label, IconSlot } from "./slots";
export * as Icons from "#fuse/material_ui/Icons";
export * as Colors from "#fuse/material_ui/Colors";
