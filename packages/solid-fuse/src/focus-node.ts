import { createController } from "./controller";

export type FocusNode = {
  _ref: number;
  hasFocus: () => boolean;
  focus: () => void;
  unfocus: () => void;
};

export function createFocusNode(): FocusNode {
  const { _ref, call, state } = createController("focusNode");
  return {
    _ref,
    hasFocus: state<boolean>("hasFocus", false),
    focus: () => call("focus"),
    unfocus: () => call("unfocus"),
  };
}
