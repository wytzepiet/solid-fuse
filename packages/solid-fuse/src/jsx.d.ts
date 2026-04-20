declare global {
  namespace JSX {
    // Intrinsic elements are a private wire format between wrappers and the
    // runtime — typed props live on the wrapper components themselves.
    type Element = any;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [name: string]: any;
    }
  }
}

export {};
