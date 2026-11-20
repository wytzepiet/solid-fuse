import { GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createMemo, createSignal, onCleanup } from "solid-js";

// The JS runtime's timers are not part of the framework's typings; declared locally.
declare function setInterval(handler: () => void, ms: number): number;
declare function clearInterval(id: number): void;

const DURATION_MS = 250;
const FRAME_MS = 16;
const BODY_PADDING = 16;
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 21;
const CHARS_PER_LINE = 36;

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);
  // Linear animation progress: 0 = collapsed, 1 = expanded.
  const [progress, setProgress] = createSignal(0);

  let timer: number | undefined;
  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
  onCleanup(stop);

  const toggle = () => {
    const target = open() ? 0 : 1;
    setOpen(target === 1);
    stop();
    let last = Date.now();
    timer = setInterval(() => {
      const now = Date.now();
      const step = (now - last) / DURATION_MS;
      last = now;
      const current = progress();
      const next =
        target === 1 ? Math.min(1, current + step) : Math.max(0, current - step);
      setProgress(next);
      if (next === target) stop();
    }, FRAME_MS);
  };

  const eased = createMemo(() => easeInOut(progress()));

  // The API has no way to measure a widget's natural height, so the animated height runs to an estimate from the text length.
  const estimatedHeight = createMemo(() => {
    const lines = props.body
      .split("\n")
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
    return BODY_PADDING * 2 + lines * BODY_LINE_HEIGHT;
  });

  // Fully open: no cap, so the body takes its real height.
  const bodyMaxHeight = createMemo(() =>
    progress() >= 1 ? undefined : eased() * estimatedHeight(),
  );

  return (
    <View
      clipBehavior="antiAlias"
      decoration={{
        color: "white",
        borderRadius: 12,
        border: { width: 1, color: "#E0E0E0" },
      }}
      flex={{ direction: "vertical", align: "stretch" }}
    >
      <GestureDetector onTap={toggle} behavior="opaque">
        <View
          padding={16}
          flex={{ direction: "horizontal", gap: 12, align: "center", justify: "spaceBetween" }}
        >
          <View grow={1}>
            <Text fontSize={16} fontWeight="semiBold" color="#212121" maxLines={1} overflow="ellipsis">
              {props.title}
            </Text>
          </View>
          <View transform={{ rotate: eased() * Math.PI }}>
            <Icon data={expandMore} size={24} color="#616161" />
          </View>
        </View>
      </GestureDetector>
      <Show when={progress() > 0}>
        <View clipBehavior="hardEdge" maxHeight={bodyMaxHeight()}>
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
