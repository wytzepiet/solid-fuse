import { makeNode, setProp as rawSetProp, scheduleFlush, ops } from "./renderer";
import { onCleanup, getOwner, createSignal } from "solid-js";

export function createHandle(type: string, props: Record<string, any> = {}) {
  const node = makeNode(type);
  Object.assign(node.props, props);
  ops.push({ op: "create", id: node.props._id, type, props: { _id: node.props._id, ...props } });

  if (getOwner()) {
    onCleanup(() => {
      ops.push({ op: "dispose", id: node.props._id });
      scheduleFlush();
    });
  }

  return {
    _ref: node.props._id,
    call: (method: string, value?: any) => {
      ops.push({ op: "call", id: node.props._id, method, value });
      scheduleFlush();
    },
    state: <T>(name: string, initialValue: T): (() => T) => {
      const [get, set] = createSignal<any>(initialValue);
      let registered = false;
      return (() => {
        if (!registered) {
          registered = true;
          rawSetProp(node, `_state:${name}`, set);
        }
        return get();
      }) as () => T;
    },
  };
}
