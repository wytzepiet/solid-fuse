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
export { on, send } from "./channels";
