import "./polyfills";

export {
  render,
  effect,
  memo,
  createComponent,
  createElement,
  createTextNode,
  insertNode,
  insert,
  spread,
  setProp,
  mergeProps,
  flush,
  flushOps,
  For,
  Show,
  Switch,
  Match,
} from "./renderer";
export type { FuseNode } from "./renderer";
export { Navigator, useNavigator } from "./navigator";
export { createController } from "./controller";
export { createScrollController } from "./scroll-controller";
export type { ScrollController } from "./scroll-controller";
export { on, send, channels } from "./channels";
export { defineConfig } from "./config";
export type { FuseConfig } from "./config";
export type * from "./types";
