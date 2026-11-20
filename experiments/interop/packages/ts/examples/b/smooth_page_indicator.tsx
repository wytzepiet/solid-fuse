// README: SmoothPageIndicator(controller: controller, count: 6, effect: WormEffect(), onDotClicked: (index) {})
//         AnimatedSmoothIndicator(activeIndex: yourActiveIndex, count: 6, effect: WormEffect())
import { createSignal } from "solid-js";
import { AnimatedSmoothIndicator } from "~/_generated/smooth_page_indicator";
import { Dots } from "../../wrappers/dots";

export function Raw() {
  const [page] = createSignal(0);
  return <AnimatedSmoothIndicator activeIndex={page()} count={6} effect={{ $: "WormEffect", dotHeight: 8, dotWidth: 8, activeDotColor: "Colors.indigo" }} />;
}
export function Nice() {
  const [page] = createSignal(0);
  return <Dots index={page()} count={6} effect="worm" activeColor="Colors.indigo" />;
}
