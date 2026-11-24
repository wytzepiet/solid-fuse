import { MaterialApp as GMaterialApp, type ThemeData as ThemeDataValue } from "#fuse/material_ui";
import { ThemeData } from "#fuse/material_ui/ThemeData";
import { PageTypeContext } from "solid-fuse";
import { materialPage } from "./page";
import type { Color, TargetPlatform } from "#fuse/flutter";

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
  /**
   * Behave like this platform: page transitions and the iOS back swipe,
   * scroll physics, text selection, typography. Default: the device's.
   */
  platform?: TargetPlatform;
  debugShowCheckedModeBanner?: boolean;
  children?: JSX.Element;
}

function themeOf(
  t: MaterialTheme | undefined,
  brightness: "light" | "dark",
  platform: TargetPlatform | undefined,
): ThemeDataValue | undefined {
  if (t == null) {
    if (platform == null) return brightness === "dark" ? ThemeData.dark() : undefined;
    return ThemeData({ brightness, platform });
  }
  if (!("$" in t)) {
    const brief = t as BriefTheme;
    return ThemeData({
      colorSchemeSeed: brief.seedColor ?? "#6750a4",
      brightness: brief.brightness ?? brightness,
      fontFamily: brief.fontFamily,
      contrastLevel: brief.contrast,
      platform,
    });
  }
  return platform == null ? (t as ThemeDataValue) : withPlatform(t as ThemeDataValue, platform);
}

/**
 * The platform has to go into the constructor: ThemeData derives its
 * typography from it, which a later `copyWith` wouldn't redo.
 */
function withPlatform(t: ThemeDataValue, platform: TargetPlatform): ThemeDataValue {
  const v = t as any;
  switch (v.$) {
    case "ThemeData":
      return { ...v, platform };
    case "ThemeData.light":
    case "ThemeData.fallback":
      return ThemeData({ brightness: "light", useMaterial3: v.useMaterial3, platform });
    case "ThemeData.dark":
      return ThemeData({ brightness: "dark", useMaterial3: v.useMaterial3, platform });
    case "ThemeData.from":
      return ThemeData({ colorScheme: v.colorScheme, textTheme: v.textTheme, useMaterial3: v.useMaterial3, platform });
    default:
      return t;
  }
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
        theme={themeOf(props.theme, "light", props.platform)}
        darkTheme={
          props.darkTheme !== undefined
            ? themeOf(props.darkTheme, "dark", props.platform)
            : props.theme && !("$" in props.theme)
              ? themeOf({ ...props.theme, brightness: "dark" }, "dark", props.platform)
              : undefined
        }
        themeMode={props.themeMode ?? "system"}
        color={props.color}
        debugShowCheckedModeBanner={props.debugShowCheckedModeBanner ?? false}
        // The OS link goes to the app's routes, not to this Navigator.
        initialRoute="/"
        home={props.children}
      />
    </PageTypeContext>
  );
}
