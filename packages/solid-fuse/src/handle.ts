import { channels } from "./channels";
import {
  FuseNode,
  ops,
  scheduleFlush,
  setProp as rawSetProp,
} from "./renderer";

/**
 * A persistent Dart-side object backed by a `FuseNode`, controlled from JS.
 *
 * Subclass it to wrap a Flutter controller, route, or any long-lived native
 * resource: declare the node `type` to `super`, expose typed methods that
 * delegate to {@link call}, and override {@link dispose} if the JS side needs
 * extra teardown. The `create*` factory functions (`createScrollController`,
 * …) construct a subclass and wire owner-scoped auto-disposal; reach for
 * `new Subclass(...)` directly when you want to own the lifecycle yourself.
 *
 * The phantom `K` threads through `FuseNode<K>`'s `type` so a `ScrollController`
 * can't be passed where a `FocusNode` is expected. Because it's a real class,
 * the distinction is nominal (prototype chain + the private `#disposed` field)
 * and checkable at runtime with `instanceof` — not just a structural alias.
 *
 * When a handle is passed as a widget prop, the renderer serializes only
 * `.node` (it reads `value.node instanceof FuseNode`). Keeping methods on the
 * prototype means the instance's own props stay minimal, so nothing but the
 * node reference crosses the bridge.
 */
export abstract class FuseHandle<K extends string> {
  /** The backing node. Widgets that accept the handle as a prop read this to
   *  serialize a `_node: <id>` reference over the bridge. */
  readonly node: FuseNode<K>;

  #disposed = false;

  constructor(type: K, props: Record<string, any> = {}) {
    const node = new FuseNode(type);
    this.node = node;

    // Split props: plain values land inline in the create op so the Dart
    // factory sees them immediately (needed for things like
    // `initialScrollOffset` on ScrollController). Functions and node refs go
    // through rawSetProp so the renderer's setProperty logic registers them
    // correctly (handlers registry for functions, `_node` wire tag for refs).
    const createProps: Record<string, any> = {};
    const deferred: Array<[string, any]> = [];
    for (const [k, v] of Object.entries(props)) {
      if (
        typeof v === "function" ||
        v instanceof FuseNode ||
        v?.node instanceof FuseNode
      ) {
        deferred.push([k, v]);
      } else {
        createProps[k] = v;
        node.props[k] = v;
      }
    }
    ops.push({ op: "create", id: node.id, type, props: createProps });
    for (const [k, v] of deferred) rawSetProp(node, k, v);
    scheduleFlush();
  }

  /**
   * Send an imperative RPC to the Dart handle. Resolves with the Dart
   * handler's return value. Protected: subclasses expose typed wrappers
   * (`animateTo`, `focus`, …) so the raw call surface stays off the public API.
   */
  protected call(
    method: string,
    value?: any,
    options?: { timeout?: number },
  ): Promise<any> {
    return channels.call(
      "_handleCall",
      { node: this.node.id, method, value },
      options,
    );
  }

  /**
   * Tear down the Dart handle. Idempotent — safe to call manually even when a
   * `create*` factory has already wired it to owner cleanup.
   */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    ops.push({ op: "dispose", id: this.node.id });
    scheduleFlush();
  }
}

/**
 * Marker base for handles whose Dart object is a Flutter `NavigatorObserver`.
 *
 * Core stays observer-agnostic: it only knows "a handle can supply an
 * observer." Third-party packages subclass this (e.g. heroine's
 * `HeroineController`); the Dart side registers the wrapped observer into
 * `runtime.navigatorObservers`, which the `<Navigator>` feeds to Flutter.
 *
 * The class exists so a prop can demand a navigator observer *nominally* — any
 * `NavigatorObserverHandle` subclass satisfies it, while a structurally similar
 * handle (e.g. a `ScrollController`) does not.
 */
export abstract class NavigatorObserverHandle<
  K extends string,
> extends FuseHandle<K> {}
