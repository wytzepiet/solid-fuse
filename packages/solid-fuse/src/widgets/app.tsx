import { PageTypeContext, page } from "../pages/page";
import type { ColorInput, FontWeight } from "../types";

export interface AppProps {
  /** Shown by the OS task switcher. */
  title?: string;
  /** The app's main color, for the OS (task switcher, web theme). */
  color?: ColorInput;
  /** BCP 47 tag, e.g. `"en-US"`. */
  locale?: string;
  /** Default text style for everything inside. */
  textStyle?: { fontFamily?: string; fontSize?: number; fontWeight?: FontWeight; color?: ColorInput };
  children?: JSX.Element;
}

/**
 * The root of a design-free app: a root navigator (for `<Modal>`, pages)
 * and an overlay (for `<Tooltip>`, `<Menu>`). Pages pushed as bare
 * components are core `page()`s. Design packages bring their own root
 * (`MaterialApp`, `CupertinoApp`).
 */
export function App(props: AppProps) {
  return (
    <PageTypeContext value={(child) => page({ child })}>
      <app {...props} />
    </PageTypeContext>
  );
}
