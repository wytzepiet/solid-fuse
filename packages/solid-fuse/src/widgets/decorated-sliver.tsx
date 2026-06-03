import type { BaseProps, DecorationInput } from "../types";

export interface DecoratedSliverProps extends BaseProps {
  decoration?: DecorationInput;
  position?: "background" | "foreground";
}

export function DecoratedSliver(props: DecoratedSliverProps) {
  return <decoratedSliver {...props} />;
}
