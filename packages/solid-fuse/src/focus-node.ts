import { createSignal } from "solid-js";
import { createHandle, type Handle } from "./handle";

export type FocusNode = Handle<"focusNode"> & {
  hasFocus: () => boolean;
  focus: () => void;
  unfocus: () => void;
  dispose: () => void;
};

export function createFocusNode(): FocusNode {
  const [hasFocus, setHasFocus] = createSignal(false);
  const { node, call, dispose } = createHandle("focusNode", { setHasFocus });
  return {
    node,
    hasFocus,
    focus: () => call("focus"),
    unfocus: () => call("unfocus"),
    dispose,
  };
}
