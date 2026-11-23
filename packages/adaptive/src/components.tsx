import * as C from "@solid-fuse/cupertino";
import * as M from "@solid-fuse/material";
import { Show } from "solid-js";
import type { TextInputBaseProps } from "solid-fuse";
import { AdaptiveProvider, platformDesign, useDesign, type Design } from "./platform";

/** Material on one side, Cupertino on the other, picked where it renders. */
function adapt<P>(material: (p: P) => JSX.Element, cupertino: (p: P) => JSX.Element) {
  return (props: P) => {
    const design = useDesign();
    return <Show when={design() === "cupertino"} fallback={material(props)}>{cupertino(props)}</Show>;
  };
}

export interface AdaptiveAppProps extends M.MaterialAppProps {
  /**
   * Behave like this platform: the design adaptive components render, plus
   * Flutter's platform feel (page transitions, scroll physics, text
   * selection, typography). Change it any time to preview the other platform.
   * Default: the device's.
   */
  platform?: M.MaterialAppProps["platform"];
  /** Force only the components' design. Default: the `platform`'s. */
  design?: Design;
}

/**
 * The root of an adaptive app. A Material app on every platform (so either
 * design's widgets work inside, and pages slide the iOS way on iOS); the
 * adaptive components below pick their design from the platform.
 */
export function AdaptiveApp(props: AdaptiveAppProps) {
  return (
    <M.MaterialApp {...props}>
      <AdaptiveProvider design={props.design ?? platformDesign(props.platform)}>{props.children}</AdaptiveProvider>
    </M.MaterialApp>
  );
}

export interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  /** `"filled"`: the main action (Material filled, iOS filled); `"plain"`: the rest (text buttons). Default `"filled"`. */
  variant?: "filled" | "plain";
  children?: M.Label;
}

export const Button = adapt<ButtonProps>(
  (p) => <M.Button variant={p.variant === "plain" ? "text" : "filled"} onPress={p.onPress} disabled={p.disabled}>{p.children}</M.Button>,
  (p) => <C.Button variant={p.variant === "plain" ? "plain" : "filled"} onPress={p.onPress} disabled={p.disabled}>{p.children}</C.Button>,
);

export type SwitchProps = M.SwitchProps;
export const Switch = adapt<SwitchProps>((p) => <M.Switch {...p} />, (p) => <C.Switch {...p} />);

export type CheckboxProps = M.CheckboxProps;
export const Checkbox = adapt<CheckboxProps>((p) => <M.Checkbox {...p} />, (p) => <C.Checkbox {...p} />);

export type SliderProps = C.SliderProps;
export const Slider = adapt<SliderProps>((p) => <M.Slider {...p} />, (p) => <C.Slider {...p} />);

export interface TextFieldProps extends TextInputBaseProps {
  /** Material: the floating label. iOS has none, so it becomes the placeholder. */
  label?: string;
  prefix?: M.IconSlot;
  suffix?: M.IconSlot;
}

export const TextField = adapt<TextFieldProps>(
  (p) => <M.TextField {...p} prefixIcon={p.prefix} suffixIcon={p.suffix} />,
  (p) => <C.TextField {...p} placeholder={p.placeholder ?? p.label} />,
);

export interface ProgressIndicatorProps {
  color?: M.ProgressIndicatorProps["color"];
}

/** An indeterminate spinner. */
export const ProgressIndicator = adapt<ProgressIndicatorProps>(
  (p) => <M.ProgressIndicator color={p.color} />,
  (p) => <C.ActivityIndicator color={p.color} />,
);

export interface DialogAction {
  label: string;
  onPress?: () => void;
  /** The suggested choice. */
  default?: boolean;
  /** Deletes or can't be undone. */
  destructive?: boolean;
}

export interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: M.Label;
  actions?: DialogAction[];
  dismissible?: boolean;
  children?: M.Label;
}

/** An alert with a title, a message and buttons. */
export const Dialog = adapt<DialogProps>(
  (p) => (
    <M.Dialog
      open={p.open}
      onOpenChange={p.onOpenChange}
      title={p.title}
      dismissible={p.dismissible}
      actions={(p.actions ?? []).map((a) => (
        <M.Button variant="text" onPress={a.onPress}>{a.label}</M.Button>
      ))}
    >
      {p.children}
    </M.Dialog>
  ),
  (p) => (
    <C.Dialog
      open={p.open}
      onOpenChange={p.onOpenChange}
      title={p.title}
      dismissible={p.dismissible}
      actions={(p.actions ?? []).map((a) => (
        <C.DialogAction onPress={a.onPress} default={a.default} destructive={a.destructive}>{a.label}</C.DialogAction>
      ))}
    >
      {p.children}
    </C.Dialog>
  ),
);
