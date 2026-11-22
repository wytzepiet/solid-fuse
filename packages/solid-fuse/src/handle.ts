import { getOwner, onCleanup } from "solid-js";
import { channels } from "./channels";
import { type FuseNode, createNode, ops, scheduleFlush } from "./renderer";

/**
 * Structural contract for a handle: carries a `FuseNode` in its `node`
 * field. Widgets receive the whole handle object as a prop; the renderer
 * reads `.node` to serialize the reference.
 *
 * The phantom `K` threads through `FuseNode<K>`'s `type` field so TS can
 * discriminate between handle kinds at prop sites (e.g. a `ScrollController`
 * can't be passed where a `FocusNode` is expected, even though both are
 * structurally `{ node: FuseNode }`).
 */
export type Handle<K extends string> = { node: FuseNode<K> };

export type CallFn = (
  method: string,
  value?: any,
  options?: { timeout?: number },
) => Promise<any>;

/**
 * The runtime shape returned by `createHandle`: a node, an RPC call
 * function, and an idempotent dispose function. Typed factory wrappers
 * (`createFocusNode`, etc.) destructure these and compose a user-facing
 * API — `call` and `dispose` stay closure-scoped so they don't appear on
 * the value a consumer holds.
 *
 * Callers outside a reactive owner must invoke `dispose` themselves when
 * done; inside an owner, it's wired to `onCleanup` automatically.
 */
export type HandleRuntime<K extends string> = Handle<K> & {
  call: CallFn;
  dispose: () => void;
};

/**
 * Create a handle — a persistent Dart-side object backed by a node of the
 * given `type`. If called inside a reactive owner, the handle auto-disposes
 * on owner cleanup; outside an owner, the caller is responsible for
 * lifecycle.
 */
export function createHandle<K extends string>(
  type: K,
  props: Record<string, any> = {},
): HandleRuntime<K> {
  // The props ride in the node's `create` op, so the handle factory sees
  // them immediately (needed for things like `initialScrollOffset` on
  // ScrollController).
  const node = createNode(type, props);
  scheduleFlush();

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ops.push({ op: "dispose", id: node.id });
    scheduleFlush();
  };

  if (getOwner()) onCleanup(dispose);

  return {
    node,
    call: (method, value, options) =>
      channels.call(
        "_handleCall",
        { node: node.id, method, value },
        options,
      ),
    dispose,
  };
}
