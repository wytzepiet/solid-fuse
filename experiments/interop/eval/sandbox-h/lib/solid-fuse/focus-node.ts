export interface FocusNode { readonly hasFocus: () => boolean; requestFocus(): void; unfocus(): void; }
export declare function createFocusNode(): FocusNode;
