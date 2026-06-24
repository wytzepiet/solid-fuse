import { createSignal, getOwner, onCleanup } from "solid-js";
import { FuseHandle } from "./handle";

export class FocusNode extends FuseHandle<"focusNode"> {
  /** Reactive signal — true while the field is focused. */
  readonly hasFocus: () => boolean;

  constructor() {
    const [hasFocus, setHasFocus] = createSignal(false);
    super("focusNode", { setHasFocus });
    this.hasFocus = hasFocus;
  }

  focus() {
    return this.call("focus");
  }

  unfocus() {
    return this.call("unfocus");
  }
}

/**
 * Create a focus node backed by a Flutter `FocusNode`. Pass it to a
 * `<TextField focusNode={...}>` to drive focus imperatively and read
 * `hasFocus()` reactively.
 *
 * Created inside a reactive owner it auto-disposes on cleanup; otherwise (or
 * with `new FocusNode()`) call `dispose()` yourself.
 */
export function createFocusNode(): FocusNode {
  const node = new FocusNode();
  if (getOwner()) onCleanup(() => node.dispose());
  return node;
}
