import { createContext, useContext } from "solid-js";
import { host } from "solid-fuse";

/** Which design adaptive components render. */
export type Design = "material" | "cupertino";

/** Cupertino on iOS and macOS, Material everywhere else. */
export function platformDesign(): Design {
  return host.platform === "ios" || host.platform === "macos" ? "cupertino" : "material";
}

const DesignContext = createContext<Design | undefined>(undefined);

/** Overrides the design below it, e.g. to preview iOS on Android. */
export function AdaptiveProvider(props: { design: Design; children?: JSX.Element }) {
  return <DesignContext value={props.design}>{props.children}</DesignContext>;
}

/** The design adaptive components render here. */
export function useDesign(): Design {
  return useContext(DesignContext) ?? platformDesign();
}
