import { GestureDetector, Icon, ScrollView, Text, View } from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createMemo, createSignal, onCleanup } from "solid-js";

// Runtime timer globals, declared locally so the module type-checks without DOM/Node libs.
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(id: number): void;

const DURATION_MS = 250;
const FRAME_MS = 16;
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 1.5;
const BODY_PADDING = 16;
const UNBOUNDED = 100000;

// The framework has no way to measure a widget, so the body's natural height is
// estimated from its text; the estimate only paces the animation (the open state is uncapped).
function estimateBodyHeight(body: string): number {
  const charsPerLine = 40;
  let lines = 0;
  for (const paragraph of body.split("\n")) {
    lines += Math.max(1, Math.ceil(paragraph.length / charsPerLine));
  }
  return lines * BODY_FONT_SIZE * BODY_LINE_HEIGHT + BODY_PADDING * 2;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

export function CollapsiblePanel(props: { title: string; body: string }) {
  // 0 = collapsed, 1 = expanded (linear progress; eased when read).
  const [progress, setProgress] = createSignal(0);

  let current = 0;
  let target = 0;
  let lastTick = 0;
  let timer: number | undefined;

  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const tick = () => {
    const now = Date.now();
    const step = (now - lastTick) / DURATION_MS;
    lastTick = now;
    current = target > current ? Math.min(target, current + step) : Math.max(target, current - step);
    setProgress(current);
    if (current === target) stop();
  };

  const toggle = () => {
    target = target === 1 ? 0 : 1;
    if (timer === undefined) {
      lastTick = Date.now();
      timer = setInterval(tick, FRAME_MS);
    }
  };

  onCleanup(stop);

  const eased = createMemo(() => easeInOut(progress()));
  const bodyMaxHeight = createMemo(() =>
    progress() >= 1 ? UNBOUNDED : eased() * estimateBodyHeight(props.body),
  );

  return (
    <View
      flex={{ direction: "vertical", align: "stretch" }}
      clipBehavior="antiAlias"
      decoration={{
        color: "white",
        borderRadius: 12,
        border: { width: 1, color: "#E0E0E0" },
      }}
    >
      <GestureDetector onTap={toggle} behavior="opaque">
        <View
          padding={16}
          flex={{ direction: "horizontal", align: "center", gap: 12 }}
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
      <View
        visible={progress() > 0}
        maxHeight={bodyMaxHeight()}
        clipBehavior="hardEdge"
      >
        <ScrollView physics="never" clipBehavior="hardEdge">
          <View padding={BODY_PADDING}>
            <Text fontSize={BODY_FONT_SIZE} lineHeight={BODY_LINE_HEIGHT} color="#424242">
              {props.body}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
