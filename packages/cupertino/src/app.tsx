import { CupertinoApp as GCupertinoApp, type CupertinoThemeData as ThemeDataValue } from "#fuse/cupertino_ui";
import { CupertinoThemeData } from "#fuse/cupertino_ui/CupertinoThemeData";
import { PageTypeContext } from "solid-fuse";
import { cupertinoPage } from "./page";
import type { Color } from "#fuse/flutter";

/** A theme in brief, or a full generated `CupertinoThemeData(...)`. */
export type CupertinoTheme = ThemeDataValue | BriefCupertinoTheme;

export type BriefCupertinoTheme = {
  /** Tint of buttons, switches, links. Default system blue. */
  primaryColor?: Color;
  /** Leave out to follow the system. */
  brightness?: "light" | "dark";
  barBackgroundColor?: Color;
  scaffoldBackgroundColor?: Color;
};

export interface CupertinoAppProps {
  title?: string;
  theme?: CupertinoTheme;
  color?: Color;
  debugShowCheckedModeBanner?: boolean;
  children?: JSX.Element;
}

function themeOf(t: CupertinoTheme | undefined): ThemeDataValue | undefined {
  if (t == null || "$" in t) return t as ThemeDataValue | undefined;
  const brief = t as BriefCupertinoTheme;
  return CupertinoThemeData({
    brightness: brief.brightness ?? null,
    primaryColor: brief.primaryColor ?? null,
    barBackgroundColor: brief.barBackgroundColor ?? null,
    scaffoldBackgroundColor: brief.scaffoldBackgroundColor ?? null,
  });
}

/** The root of an iOS-style app; pages are `cupertinoPage()`s. */
export function CupertinoApp(props: CupertinoAppProps) {
  return (
    <PageTypeContext value={(child) => cupertinoPage({ child })}>
      <GCupertinoApp
        title={props.title ?? ""}
        theme={themeOf(props.theme)}
        color={props.color}
        debugShowCheckedModeBanner={props.debugShowCheckedModeBanner ?? false}
        home={props.children}
      />
    </PageTypeContext>
  );
}
