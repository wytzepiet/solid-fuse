export interface ScrollController { readonly offset: () => number; animateTo(offset: number, opts?: { duration?: number }): void; jumpTo(offset: number): void; }
export declare function createScrollController(): ScrollController;
