import { View, Text, Icon, GestureDetector, ScrollView } from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createSignal, onCleanup } from "solid-js";

const DURATION_MS = 250;
const FRAME_MS = 16;
// Large enough to never constrain the body once it is fully open.
const UNBOUNDED_HEIGHT = 100000;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

export function CollapsiblePanel(props: { title: string; body: string }) {
  // 0 = collapsed, 1 = fully open.
  const [progress, setProgress] = createSignal(0);

  // Animation state lives in plain variables so it never depends on signal flush timing.
  let open = false;
  let current = 0;
  let from = 0;
  let to = 0;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const tick = () => {
    timer = undefined;
    const t = Math.min(1, (Date.now() - startedAt) / DURATION_MS);
    current = from + (to - from) * easeInOut(t);
    if (t >= 1) current = to;
    setProgress(current);
    if (t < 1) timer = setTimeout(tick, FRAME_MS);
  };

  const toggle = () => {
    open = !open;
    stop();
    from = current;
    to = open ? 1 : 0;
    startedAt = Date.now();
    timer = setTimeout(tick, FRAME_MS);
  };

  onCleanup(stop);

  // The API offers no way to measure the body's natural height, so the animation runs to an
  // estimate of it (from the text length) and the limit is lifted once fully open.
  const estimatedHeight = () => Math.max(1, Math.ceil(props.body.length / 40)) * 22 + 32;

  const bodyMaxHeight = () => {
    const p = progress();
    if (p >= 1) return UNBOUNDED_HEIGHT;
    if (p <= 0) return 0;
    return p * estimatedHeight();
  };

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
          flex={{ direction: "horizontal", gap: 12, align: "center" }}
        >
          <View grow={1}>
            <Text fontSize={16} fontWeight="semiBold" color="#212121" maxLines={2} overflow="ellipsis">
              {props.title}
            </Text>
          </View>
          <View transform={{ rotate: progress() * Math.PI }}>
            <Icon data={expandMore} size={24} color="#616161" />
          </View>
        </View>
      </GestureDetector>
      <View maxHeight={bodyMaxHeight()} clipBehavior="antiAlias">
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
