import { View, Text, Icon, GestureDetector, Show } from "solid-fuse";
import { expand_more } from "solid-fuse/icons/material";
import { createSignal, createMemo, onCleanup } from "solid-js";

const DURATION_MS = 250;
const FRAME_MS = 16;
const BODY_PADDING = 16;
const BODY_FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const CHARS_PER_LINE = 42;

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);
  // 0 = collapsed, 1 = expanded
  const [progress, setProgress] = createSignal(0);

  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const animateTo = (target: number) => {
    stop();
    const from = progress();
    const span = Math.abs(target - from);
    if (span === 0) return;
    const duration = DURATION_MS * span;
    const start = Date.now();
    timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setProgress(from + (target - from) * t);
      if (t >= 1) stop();
    }, FRAME_MS);
  };

  onCleanup(stop);

  const toggle = () => {
    const next = !open();
    setOpen(next);
    animateTo(next ? 1 : 0);
  };

  // ease-in-out curve shared by the height and the chevron so they stay in sync
  const eased = createMemo(() => {
    const t = progress();
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  });

  // The body's natural height cannot be measured, so it is estimated while animating;
  // once fully open the height constraint is dropped and the body takes its real size.
  const estimatedHeight = createMemo(() => {
    const lines = Math.max(1, Math.ceil(props.body.length / CHARS_PER_LINE));
    return lines * LINE_HEIGHT + BODY_PADDING * 2;
  });

  const bodyHeight = createMemo(() =>
    progress() >= 1 ? undefined : estimatedHeight() * eased(),
  );

  return (
    <View
      clip
      decoration={{
        color: "#FFFFFF",
        borderRadius: 12,
        border: { width: 1, color: "#E0E0E0" },
      }}
      flex={{ direction: "column" }}
    >
      <GestureDetector onTap={toggle}>
        <View
          padding={{ horizontal: 16, vertical: 14 }}
          decoration={{ color: "#FFFFFF" }}
          flex={{ direction: "row", align: "center", gap: 12 }}
        >
          <View grow={1}>
            <Text fontSize={16} fontWeight="bold" color="#212121">
              {props.title}
            </Text>
          </View>
          <View transform={{ rotate: Math.PI * eased() }}>
            <Icon data={expand_more} size={24} color="#616161" />
          </View>
        </View>
      </GestureDetector>
      <Show when={progress() > 0}>
        <View clip height={bodyHeight()}>
          <View padding={BODY_PADDING}>
            <Text fontSize={BODY_FONT_SIZE} color="#424242">
              {props.body}
            </Text>
          </View>
        </View>
      </Show>
    </View>
  );
}
