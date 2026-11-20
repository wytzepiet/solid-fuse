// Thin TS helpers over flutter_animate's generated `Animate` widget. No component at all: these are
// constructors for the tagged effect records, so `effects={[fade(), scale()]}` reads like the Dart list API.
// Per render: nothing beyond building the array the raw API needs anyway (1 small object per effect).
import type { EffectOfdynamic } from "~/_generated/flutter_animate";

type Arm<T extends string> = Omit<Extract<EffectOfdynamic, { $: T }>, "$">;
const make = <T extends Extract<EffectOfdynamic, { $: string }>["$"]>(tag: T) =>
  (o: Arm<T> = {} as Arm<T>): EffectOfdynamic => ({ $: tag, ...o }) as EffectOfdynamic;

export const fade = make("FadeEffect");
export const scale = make("ScaleEffect");
export const slide = make("SlideEffect");
export const move = make("MoveEffect");
export const shake = make("ShakeEffect");
export const shimmer = make("ShimmerEffect");
export const tint = make("TintEffect");
export const then = make("ThenEffect");
