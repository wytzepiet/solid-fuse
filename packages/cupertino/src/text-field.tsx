import { type TextInputBaseProps } from "solid-fuse";
import { icon, type IconSlot } from "./slots";

export interface TextFieldProps extends TextInputBaseProps {
  /** Default `"rounded"`, a bordered box; `"borderless"` for forms and lists. */
  variant?: "rounded" | "borderless";
  prefix?: IconSlot;
  suffix?: IconSlot;
  /** An ⓧ that clears the text while editing. */
  clearButton?: boolean;
}

/** iOS text field. Controlled with `value` + `onChange`. */
export function TextField(props: TextFieldProps) {
  return <cupertinoTextField {...props} prefix={icon(props.prefix)} suffix={icon(props.suffix)} />;
}
