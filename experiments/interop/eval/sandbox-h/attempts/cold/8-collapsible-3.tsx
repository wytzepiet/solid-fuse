import { View, Text, Icon, GestureDetector, ScrollView } from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createSignal, createMemo, onCleanup } from "solid-js";

// Timer globals provided by the JS runtime (declared locally so the module does not depend on DOM typings).
declare function setInterval(handler: () => void, ms: number): number;
declare function clearInterval(id: number): void;

const DURATION_MS = 250;
const FRAME_MS = 16;
const OPEN_MAX_HEIGHT = 100000;

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);
  // Linear animation progress: 0 = collapsed, 1 = expanded.
  const [progress, setProgress] = createSignal(0);

  let timer: number | undefined;
  let lastTick = 0;

  const stopTimer = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const tick = () => {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;
    const dir = open() ? 1 : -1;
    const next = Math.min(1, Math.max(0, progress() + (dir * dt) / DURATION_MS));
    setProgress(next);
    if (next === 0 || next === 1) stopTimer();
  };

  const toggle = () => {
    setOpen(!open());
    if (timer === undefined) {
      lastTick = Date.now();
      timer = setInterval(tick, FRAME_MS);
    }
  };

  onCleanup(stopTimer);

  // Ease-in-out cubic.
  const eased = createMemo(() => {
    const p = progress();
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  });

  // No way to measure the body's natural height, so the animation targets an estimate (approx. 44 chars per 20px line + padding); the cap is lifted once fully open.
  const estimatedHeight = createMemo(
    () => 32 + Math.max(1, Math.ceil(props.body.length / 44)) * 20,
  );

  const bodyMaxHeight = createMemo(() =>
    progress() >= 1 ? OPEN_MAX_HEIGHT : eased() * estimatedHeight(),
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
          decoration={{ color: "white" }}
          flex={{
            direction: "horizontal",
            align: "center",
            justify: "spaceBetween",
            gap: 12,
          }}
        >
          <View grow={1}>
            <Text
              fontSize={16}
              fontWeight="semiBold"
              color="#212121"
              maxLines={1}
              overflow="ellipsis"
            >
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
        visible={progress() > 0}
        clipBehavior="antiAlias"
      >
        <ScrollView>
          <View padding={16}>
            <Text fontSize={14} color="#424242">
              {props.body}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
