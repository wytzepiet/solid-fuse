// Minimal JSX environment for type-checking the samples standalone
// (mirrors packages/solid-fuse/src/jsx.d.ts, but with a real Element type).
import type { FuseElement } from "./fuse-gen-base";

declare global {
  namespace JSX {
    type Element = FuseElement;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [name: string]: any;
    }
  }
}
