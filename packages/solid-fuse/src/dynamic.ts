import { createMemo, omit, untrack, type JSX, type ValidComponent } from "solid-js";
import { createElement, spread } from "./renderer";

export function createDynamic<T extends object>(
  component: () => ValidComponent | undefined,
  props: T,
): JSX.Element {
  const cached = createMemo(component);
  return createMemo(() => {
    const c = cached();
    switch (typeof c) {
      case "function":
        return untrack(() => (c as (p: T) => JSX.Element)(props));
      case "string": {
        const el = createElement(c);
        spread(el, props);
        return el;
      }
    }
  }) as unknown as JSX.Element;
}

export function Dynamic<T extends { component: ValidComponent }>(
  props: T,
): JSX.Element {
  const others = omit(props, "component");
  return createDynamic(() => props.component, others);
}
