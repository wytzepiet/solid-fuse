import { type TextInputBaseProps } from "solid-fuse";
import { icon, type IconSlot } from "./slots";

export interface TextFieldProps extends TextInputBaseProps {
  /** Floats above the text once there is some. */
  label?: string;
  helper?: string;
  /** Shown in the error color instead of `helper`; empty clears it. */
  error?: string;
  /** Default `"outlined"`. */
  variant?: "outlined" | "filled" | "underline" | "none";
  prefixIcon?: IconSlot;
  suffixIcon?: IconSlot;
  prefixText?: string;
  suffixText?: string;
  /** Show the `maxLength` counter. */
  showCounter?: boolean;
  dense?: boolean;
}

/** Material's text field. Controlled with `value` + `onChange`. */
export function TextField(props: TextFieldProps) {
  return <materialTextField {...props} prefixIcon={icon(props.prefixIcon)} suffixIcon={icon(props.suffixIcon)} />;
}
