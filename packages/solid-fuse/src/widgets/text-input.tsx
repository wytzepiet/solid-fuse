import type { Color, FontWeight } from "../flutter";
import type { BaseProps } from "../types";
import type { FocusNodeInput } from "../types";

export type KeyboardType =
  | "text" | "multiline" | "number" | "integer" | "phone" | "email" | "url" | "name" | "none";

export type TextInputAction =
  | "done" | "go" | "next" | "previous" | "search" | "send" | "newline" | "none";

export type TextCapitalization = "none" | "words" | "sentences" | "characters";

/** Props every text field shares, core and design packages alike. */
export interface TextInputBaseProps extends BaseProps {
  /** The text. With `onChange`, the field is controlled. */
  value?: string;
  /** Starting text of an uncontrolled field. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** The keyboard's action button. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autofocus?: boolean;
  /** A focus node from `createFocusNode` (`#fuse/flutter`). */
  focusNode?: FocusNodeInput;
  obscureText?: boolean;
  autocorrect?: boolean;
  keyboardType?: KeyboardType;
  inputAction?: TextInputAction;
  textCapitalization?: TextCapitalization;
  keyboardAppearance?: "light" | "dark";
  autofillHints?: string[];
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";
  /** 0 for no limit. Default 1; `keyboardType="multiline"` grows. */
  maxLines?: number;
  minLines?: number;
  maxLength?: number;
  /** Only characters matching this regex source get in. */
  allowPattern?: string;
  /** Characters matching this regex source are dropped. */
  denyPattern?: string;
}

export interface TextInputProps extends TextInputBaseProps {
  color?: Color;
  fontSize?: number;
  fontWeight?: FontWeight;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  letterSpacing?: number;
  lineHeight?: number;
  placeholderColor?: Color;
  cursorColor?: Color;
  selectionColor?: Color;
}

/**
 * Editable text with no look of its own: put it in a `<View>` for a box.
 * Controlled with `value` + `onChange`: JS writes land without fighting the
 * user's typing.
 */
export function TextInput(props: TextInputProps) {
  return <textInput {...props} />;
}
