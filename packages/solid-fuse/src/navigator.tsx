import { createContext, useContext, createSignal, For } from "solid-js";
import { flushOps } from "~/renderer";
import { send } from "~/channels";
import type { FuseNode } from "~/renderer";

type PageFactory = () => any;

export interface NavigatorAPI {
  push: (page: PageFactory) => void;
  pop: () => void;
  replace: (page: PageFactory) => void;
  stackSize: () => number;
}

const NavigatorContext = createContext<NavigatorAPI>();

export function Navigator(props: { defaultPage: PageFactory }) {
  const [stack, setStack] = createSignal<PageFactory[]>([props.defaultPage]);
  let el!: FuseNode;

  const api: NavigatorAPI = {
    push(factory) {
      setStack((prev) => [...prev, factory]);
      flushOps();
      send("_nav", { op: "push", navigatorId: el.props._id });
    },
    pop() {
      if (stack().length <= 1) return;
      setStack((prev) => prev.slice(0, -1));
      flushOps();
      send("_nav", { op: "pop", navigatorId: el.props._id });
    },
    replace(factory) {
      setStack((prev) => {
        const next = prev.length > 1 ? prev.slice(0, -1) : [];
        return [...next, factory];
      });
      flushOps();
      send("_nav", { op: "replace", navigatorId: el.props._id });
    },
    stackSize: () => stack().length,
  };

  return (
    <NavigatorContext value={api}>
      <navigator
        ref={el}
        onPopPage={() => {
          setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
        }}
      >
        <For each={stack()}>
          {(factory) => factory()()}
        </For>
      </navigator>
    </NavigatorContext>
  );
}

export function useNavigator(): NavigatorAPI {
  const ctx = useContext(NavigatorContext);
  if (!ctx) throw new Error("useNavigator must be used within a <Navigator>");
  return ctx;
}
