import { MaterialApp as GMaterialApp, type ThemeData as ThemeDataValue } from "#fuse/material_ui";
import { ThemeData } from "#fuse/material_ui/ThemeData";
import { PageTypeContext } from "solid-fuse";
import { materialPage } from "./page";
import type { Color } from "#fuse/flutter";

/** A theme in brief, or a full generated `ThemeData(...)`. */
export type MaterialTheme = ThemeDataValue | BriefTheme;

export type BriefTheme = {
  /** The color the whole scheme is derived from. */
  seedColor?: Color;
  brightness?: "light" | "dark";
  fontFamily?: string;
  /** -1 (low) to 1 (high). */
  contrast?: number;
};

export interface MaterialAppProps {
  title?: string;
  theme?: MaterialTheme;
  /** Leave out to get the dark version of a brief `theme`. */
  darkTheme?: MaterialTheme;
  /** Default `"system"`. */
  themeMode?: "system" | "light" | "dark";
  /** The app's color for the OS (task switcher). */
  color?: Color;
  debugShowCheckedModeBanner?: boolean;
  children?: JSX.Element;
}

function themeOf(t: MaterialTheme | undefined, brightness: "light" | "dark"): ThemeDataValue | undefined {
  if (t == null) return brightness === "dark" ? ThemeData.dark() : undefined;
  if ("$" in t) return t as ThemeDataValue;
  const brief = t as BriefTheme;
  return ThemeData({
    colorSchemeSeed: brief.seedColor ?? "#6750a4",
    brightness: brief.brightness ?? brightness,
    fontFamily: brief.fontFamily,
    contrastLevel: brief.contrast,
  });
}

/**
 * The root of a Material app: themes, a root navigator, and pages that
 * are `materialPage()`s.
 */
export function MaterialApp(props: MaterialAppProps) {
  return (
    <PageTypeContext value={(child) => materialPage({ child })}>
      <GMaterialApp
        title={props.title ?? ""}
        theme={themeOf(props.theme, "light")}
        darkTheme={
          props.darkTheme !== undefined
            ? themeOf(props.darkTheme, "dark")
            : props.theme && !("$" in props.theme)
              ? themeOf({ ...props.theme, brightness: "dark" }, "dark")
              : undefined
        }
        themeMode={props.themeMode ?? "system"}
        color={props.color}
        debugShowCheckedModeBanner={props.debugShowCheckedModeBanner ?? false}
        home={props.children}
      />
    </PageTypeContext>
  );
}
