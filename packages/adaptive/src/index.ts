// @solid-fuse/adaptive: one component, the platform's look. Material on
// Android, Linux, Windows and the web; Cupertino on iOS and macOS.
export { AdaptiveProvider, useDesign, platformDesign, type Design } from "./platform";
export {
  AdaptiveApp, Button, Switch, Checkbox, Slider, TextField, ProgressIndicator, Dialog,
  type AdaptiveAppProps, type ButtonProps, type SwitchProps, type CheckboxProps, type SliderProps,
  type TextFieldProps, type ProgressIndicatorProps, type DialogProps, type DialogAction,
} from "./components";
