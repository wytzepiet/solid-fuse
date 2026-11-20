// Thin TS wrapper over smooth_page_indicator.AnimatedSmoothIndicator: effect picked by name, its fields flat.
// 1 native node. Per render: `effect` object rebuilt from 6 flat props when one changes; 2 props renamed.
import { AnimatedSmoothIndicator, type Color, type IndicatorEffect } from "~/_generated/smooth_page_indicator";

type EffectName = "worm" | "expanding" | "jumping" | "scale" | "slide" | "swap" | "scrolling" | "colorTransition";
const TAGS = {
  worm: "WormEffect", expanding: "ExpandingDotsEffect", jumping: "JumpingDotEffect", scale: "ScaleEffect",
  slide: "SlideEffect", swap: "SwapEffect", scrolling: "ScrollingDotsEffect", colorTransition: "ColorTransitionEffect",
} as const satisfies Record<EffectName, Extract<IndicatorEffect, { $: string }>["$"]>;

export interface DotsProps {
  index: number;
  count: number;
  effect?: EffectName;
  size?: number;
  spacing?: number;
  color?: Color;
  activeColor?: Color;
  vertical?: boolean;
}

export function Dots(props: DotsProps) {
  return (
    <AnimatedSmoothIndicator
      activeIndex={props.index}
      count={props.count}
      axisDirection={props.vertical ? "vertical" : "horizontal"}
      effect={{
        $: TAGS[props.effect ?? "worm"],
        dotWidth: props.size ?? 8,
        dotHeight: props.size ?? 8,
        spacing: props.spacing ?? 8,
        dotColor: props.color ?? "Colors.grey",
        activeDotColor: props.activeColor ?? "Colors.indigo",
      }}
    />
  );
}
