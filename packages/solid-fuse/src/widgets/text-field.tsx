import type {
  BaseProps,
  ColorInput,
  EdgeInsetsInput,
  FlexInput,
  FontWeight,
} from "../types";

export type KeyboardType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "multiline";

export type TextInputAction =
  | "done"
  | "next"
  | "send"
  | "search"
  | "go"
  | "newline";

export type TextFieldBorderStyle = "none" | "underline" | "outline";

export type TextCapitalization = "none" | "words" | "sentences" | "characters";

export type FloatingLabelBehavior = "auto" | "always" | "never";

export interface TextFieldDecoration {
  border?: TextFieldBorderStyle;
  filled?: boolean;
  fillColor?: ColorInput;
  contentPadding?: EdgeInsetsInput;
  prefixText?: string;
  suffixText?: string;
  labelText?: string;
  helperText?: string;
  errorText?: string;
  floatingLabelBehavior?: FloatingLabelBehavior;
  isDense?: boolean;
  isCollapsed?: boolean;
  hintStyle?: {
    fontSize?: number;
    color?: ColorInput;
    fontWeight?: FontWeight;
    fontFamily?: string;
  };
}

export interface TextFieldProps extends BaseProps {
  value?: string;
  focusNode?: import("../focus-node").FocusNode;

  // Text behavior
  placeholder?: string;
  hintText?: string;
  obscureText?: boolean;
  obscuringCharacter?: string;
  readOnly?: boolean;
  autofocus?: boolean;
  enabled?: boolean;
  autocorrect?: boolean;
  enableSuggestions?: boolean;
  spellCheck?: boolean;
  smartDashesType?: "disabled" | "enabled";
  smartQuotesType?: "disabled" | "enabled";
  enableIMEPersonalizedLearning?: boolean;
  textCapitalization?: TextCapitalization;
  autofillHints?: string[];
  keyboardAppearance?: "light" | "dark";

  // Input configuration
  keyboardType?: KeyboardType;
  textInputAction?: TextInputAction;
  maxLines?: number;
  minLines?: number;
  maxLength?: number;
  expands?: boolean;

  // Filtering (compiled into FilteringTextInputFormatter on the Dart side)
  allowPattern?: string;
  denyPattern?: string;

  // Text style
  fontSize?: number;
  fontWeight?: FontWeight;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  color?: ColorInput;
  letterSpacing?: number;
  height?: number;
  textDecoration?: "none" | "underline" | "overline" | "lineThrough";
  textDecorationColor?: ColorInput;
  textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | "wavy";
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";

  // Cursor
  showCursor?: boolean;
  cursorColor?: ColorInput;
  cursorWidth?: number;
  cursorHeight?: number;
  cursorRadius?: number;

  // Layout
  flex?: FlexInput;
  scrollPadding?: EdgeInsetsInput;
  decoration?: TextFieldDecoration;

  // Slots (inline JSX widgets)
  prefixIcon?: JSX.Element;
  suffixIcon?: JSX.Element;

  // Events
  onChanged?: (text: string) => void;
  onSubmitted?: (text: string) => void;
  onEditingComplete?: () => void;
  onTap?: () => void;
  onTapOutside?: () => void;
}

export function TextField(props: TextFieldProps) {
  return <textField {...props} />;
}
