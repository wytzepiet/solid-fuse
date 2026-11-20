import { GestureDetector, Icon, Text, View } from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createSignal, onCleanup } from "solid-js";

// Timer globals provided by the JS runtime (declared locally; no DOM typings are assumed).
declare function setTimeout(handler: () => void, timeout: number): number;
declare function clearTimeout(id: number): void;

const DURATION_MS = 250;
const FRAME_MS = 16;
const BODY_PADDING = 16;
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 1.4;
const UNBOUNDED_HEIGHT = 100000;

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (2 * (1 - t) * (1 - t));

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);
  // 0 = collapsed, 1 = fully open (linear progress; eased on use).
  const [progress, setProgress] = createSignal(0);

  let timer: number | undefined;
  let lastTick = 0;

  const stop = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const tick = () => {
    timer = undefined;
    const now = Date.now();
    const step = (now - lastTick) / DURATION_MS;
    lastTick = now;
    const target = open() ? 1 : 0;
    const current = progress();
    const next =
      target > current
        ? Math.min(target, current + step)
        : Math.max(target, current - step);
    setProgress(next);
    if (next !== target) timer = setTimeout(tick, FRAME_MS);
  };

  const toggle = () => {
    setOpen((v) => !v);
    if (timer === undefined) {
      lastTick = Date.now();
      timer = setTimeout(tick, FRAME_MS);
    }
  };

  onCleanup(stop);

  // The API has no layout measurement or animated-size widget, so the body's open height is
  // estimated from the text length; once fully open the cap is lifted so the text is never cut.
  const estimatedHeight = (): number => {
    const explicitLines = props.body.split("\n");
    let lines = 0;
    for (const line of explicitLines) {
      lines += Math.max(1, Math.ceil(line.length / 42));
    }
    return lines * BODY_FONT_SIZE * BODY_LINE_HEIGHT + BODY_PADDING * 2;
  };

  const eased = () => easeInOut(progress());
  const bodyMaxHeight = () =>
    progress() >= 1 ? UNBOUNDED_HEIGHT : eased() * estimatedHeight();

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
          flex={{ direction: "horizontal", align: "center", gap: 12 }}
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
        clipBehavior="hardEdge"
        visible={progress() > 0}
      >
        <View padding={BODY_PADDING}>
          <Text
            fontSize={BODY_FONT_SIZE}
            height={BODY_LINE_HEIGHT}
            color="#424242"
          >
            {props.body}
          </Text>
        </View>
      </View>
    </View>
  );
}
