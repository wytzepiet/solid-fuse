import { createSignal } from "solid-js";
import { createHandle, type Handle } from "./handle";

export type ScrollController = Handle<"scrollController"> & {
  scrollOffset: () => number;
  animateTo: (offset: number, opts?: { duration?: number }) => void;
  jumpTo: (offset: number) => void;
  dispose: () => void;
};

export function createScrollController(
  opts: { initialScrollOffset?: number } = {},
): ScrollController {
  const [scrollOffset, setScrollOffset] = createSignal(
    opts.initialScrollOffset ?? 0,
  );
  const { node, call, dispose } = createHandle("scrollController", {
    ...opts,
    setScrollOffset,
  });
  return {
    node,
    scrollOffset,
    animateTo: (offset, o) => call("animateTo", { offset, ...o }),
    jumpTo: (offset) => call("jumpTo", offset),
    dispose,
  };
}
