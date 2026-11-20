// README (declarative form): Animate(effects: [FadeEffect(), ScaleEffect()], child: Text("Hello World!"))
// README (chained form):     Text("Hello").animate().fade(duration: 500.ms).scale(delay: 500.ms)   <- extension methods: no 1:1 form
import { Text } from "solid-fuse";
import { Animate } from "~/_generated/flutter_animate";
import { fade, scale, slide } from "../../wrappers/animate";

// BEFORE
export const Raw = () => (
  <Animate effects={[{ $: "FadeEffect", duration: 500 }, { $: "ScaleEffect", delay: 500 }]}>
    <Text>Hello World!</Text>
  </Animate>
);
// AFTER
export const Nice = () => (
  <Animate effects={[fade({ duration: 500 }), scale({ delay: 500 }), slide({ begin: { dx: 0, dy: 0.2 } })]}>
    <Text>Hello World!</Text>
  </Animate>
);
