import { createHandle } from "./handle";

export type ScrollController = {
  _ref: number;
  scrollTo: (offset: number) => void;
  animateTo: (offset: number, opts?: { duration?: number }) => void;
  jumpTo: (offset: number) => void;
  scrollOffset: () => number;
};

export function createScrollController(
  opts: { initialScrollOffset?: number } = {},
): ScrollController {
  const { _ref, call, state } = createHandle("scrollController", opts);
  return {
    _ref,
    scrollTo: (offset: number) => call("scrollTo", offset),
    animateTo: (offset: number, opts?: { duration?: number }) =>
      call("animateTo", { offset, ...opts }),
    jumpTo: (offset: number) => call("jumpTo", offset),
    scrollOffset: state<number>("scrollOffset", 0),
  };
}
