import { View, Text, Icon, GestureDetector } from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createSignal, createMemo, onCleanup } from "solid-js";

const DURATION_MS = 250;
const FRAME_MS = 16;
const UNBOUNDED = 100000;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function CollapsiblePanel(props: { title: string; body: string }) {
  // 0 = collapsed, 1 = expanded (linear progress; eased when read)
  const [progress, setProgress] = createSignal(0);

  let current = 0;
  let target = 0;
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = () => {
    timer = undefined;
    const now = Date.now();
    const step = (now - lastTime) / DURATION_MS;
    lastTime = now;
    current = target === 1 ? Math.min(1, current + step) : Math.max(0, current - step);
    setProgress(current);
    if (current !== target) timer = setTimeout(tick, FRAME_MS);
  };

  const toggle = () => {
    target = target === 1 ? 0 : 1;
    if (timer === undefined) {
      lastTime = Date.now();
      timer = setTimeout(tick, FRAME_MS);
    }
  };

  onCleanup(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  const eased = createMemo(() => easeInOut(progress()));

  // The body's natural height cannot be measured, so the animation runs towards an estimate
  // (approx. line count from text length) and the height cap is lifted once fully open.
  const estimatedHeight = createMemo(() => {
    const lines = Math.max(1, Math.ceil(props.body.length / 42));
    return lines * 20 + 32;
  });

  const bodyMaxHeight = createMemo(() =>
    progress() >= 1 ? UNBOUNDED : eased() * estimatedHeight(),
  );

  return (
    <View
      clipBehavior="antiAlias"
      decoration={{
        color: "white",
        borderRadius: 12,
        border: { width: 1, color: "#E0E0E0" },
      }}
    >
      <GestureDetector onTap={toggle}>
        <View
          padding={16}
          decoration={{ color: "transparent" }}
          flex={{ direction: "horizontal", gap: 12, align: "center", justify: "spaceBetween" }}
        >
          <View grow={1}>
            <Text fontSize={16} fontWeight="semiBold" color="#222222" maxLines={1} overflow="ellipsis">
              {props.title}
            </Text>
          </View>
          <View transform={{ rotate: eased() * Math.PI }}>
            <Icon data={expandMore} size={24} color="#616161" />
          </View>
        </View>
      </GestureDetector>
      <View
        maxHeight={bodyMaxHeight()}
        clipBehavior="antiAlias"
        decoration={{ color: "transparent" }}
      >
        <View padding={16}>
          <Text fontSize={14} color="#424242">
            {props.body}
          </Text>
        </View>
      </View>
    </View>
  );
}
