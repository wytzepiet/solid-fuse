import { createContext, useContext, createSignal, For } from "solid-js";
import { createElement, insert, setProp, flushOps } from "~/renderer";
import { send } from "~/channels";
import type { FuseNode } from "~/renderer";

type PageFactory = () => any;

interface StackEntry {
  id: number;
  factory: PageFactory;
}

export interface NavigatorAPI {
  push: (page: PageFactory) => void;
  pop: () => void;
  replace: (page: PageFactory) => void;
  stackSize: () => number;
}

const NavigatorContext = createContext<NavigatorAPI>();

let entryId = 0;

export function Navigator(props: { defaultPage: PageFactory }) {
  const [stack, setStack] = createSignal<StackEntry[]>([
    { id: entryId++, factory: props.defaultPage },
  ]);

  // Create the <navigator> intrinsic manually to capture its node ID
  const el: FuseNode = createElement("navigator");
  const navigatorId = el.props._id;

  const api: NavigatorAPI = {
    push(factory) {
      setStack((prev) => [...prev, { id: entryId++, factory }]);
      flushOps();
      send("_nav", { op: "push", navigatorId });
    },
    pop() {
      if (stack().length <= 1) return;
      setStack((prev) => prev.slice(0, -1));
      flushOps();
      send("_nav", { op: "pop", navigatorId });
    },
    replace(factory) {
      setStack((prev) => {
        const next = prev.length > 1 ? prev.slice(0, -1) : [];
        return [...next, { id: entryId++, factory }];
      });
      flushOps();
      send("_nav", { op: "replace", navigatorId });
    },
    stackSize: () => stack().length,
  };

  // System back button handler — Dart calls this, we only update the signal
  setProp(el, "onPopPage", () => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  });

  // Render pages inside the provider so useNavigator() has context access.
  // The IIFE runs lazily inside the provider's children getter, after the
  // context is established.
  return (
    <NavigatorContext value={api}>
      {(() => {
        insert(el, () => (
          <For each={stack()} keyed={(entry) => entry.id}>
            {(entry) => <Route>{entry().factory()}</Route>}
          </For>
        ));
        return el as any;
      })()}
    </NavigatorContext>
  );
}

function Route(props: { children: any }) {
  return props.children;
}

export function useNavigator(): NavigatorAPI {
  const ctx = useContext(NavigatorContext);
  if (!ctx) throw new Error("useNavigator must be used within a <Navigator>");
  return ctx;
}
