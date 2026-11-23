import { createContext, useContext } from "solid-js";
import { host, type Platform } from "solid-fuse";
import type { TargetPlatform } from "#fuse/flutter";

/** Which design adaptive components render. */
export type Design = "material" | "cupertino";

/** Cupertino on iOS and macOS, Material everywhere else. Default: the device's platform. */
export function platformDesign(platform: TargetPlatform | Platform = host.platform): Design {
  const p = platform.toLowerCase();
  return p === "ios" || p === "macos" ? "cupertino" : "material";
}

const DesignContext = createContext<(() => Design) | undefined>(undefined);

/** Overrides the design below it, e.g. to preview iOS on Android. Reactive. */
export function AdaptiveProvider(props: { design: Design; children?: JSX.Element }) {
  return <DesignContext value={() => props.design}>{props.children}</DesignContext>;
}

/** The design adaptive components render here. An accessor: it follows `AdaptiveProvider` and `AdaptiveApp`. */
export function useDesign(): () => Design {
  return useContext(DesignContext) ?? (() => platformDesign());
}
