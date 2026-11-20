// Minimal Solid 2.0 type stub shared by both sandboxes (identical file in each).
export type Accessor<T> = () => T;
export type Setter<T> = (value: T | ((prev: T) => T)) => T;
export type Signal<T> = [get: Accessor<T>, set: Setter<T>];
export function createSignal<T>(value: T, options?: object): Signal<T>;
export function createSignal<T>(): Signal<T | undefined>;
export function createMemo<T>(fn: (prev?: T) => T, options?: object): Accessor<T>;
export function createEffect(compute: (prev?: any) => any, apply?: (value: any, prev?: any) => any): void;
export function createRenderEffect(compute: (prev?: any) => any, apply?: (value: any, prev?: any) => any): void;
export function onCleanup(fn: () => void): void;
export function onSettled(fn: () => void | (() => void)): void;
export function onMount(fn: () => void): void;
export function untrack<T>(fn: () => T): T;
export function batch<T>(fn: () => T): T;
export function flush(): void;
export function mergeProps<T extends object[]>(...sources: T): any;
export function splitProps<T extends object>(props: T, ...keys: (keyof T)[][]): any[];
export function createStore<T extends object>(value: T): [T, (fn: ((draft: T) => void) | Partial<T>) => void];
export type Component<P = {}> = (props: P) => JSX.Element;
export type ParentProps<P = {}> = P & { children?: JSX.Element };
export type ParentComponent<P = {}> = Component<ParentProps<P>>;
export function For<T>(props: {
  each: readonly T[] | undefined | null;
  fallback?: JSX.Element;
  children: (item: T, index: Accessor<number>) => JSX.Element;
}): JSX.Element;
export function Show<T>(props: {
  when: T | undefined | null | false;
  fallback?: JSX.Element;
  children: JSX.Element | JSX.Element[] | ((item: Accessor<NonNullable<T>>) => JSX.Element);
}): JSX.Element;
export { JSX };
export type JSXElement = JSX.Element;
