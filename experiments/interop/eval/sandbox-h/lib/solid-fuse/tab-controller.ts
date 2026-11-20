export interface TabController { readonly index: () => number; animateTo(index: number): void; }
export declare function createTabController(opts: { length: number; initialIndex?: number }): TabController;
