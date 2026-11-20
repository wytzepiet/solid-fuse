import { createMemo, createSignal, onCleanup } from "solid-js";
import { GestureDetector, Icon, ScrollView, Show, Text, View } from "solid-fuse";
import { north, south } from "solid-fuse/icons/material";

const DURATION_MS = 250;
const FRAME_MS = 16;
const BODY_PADDING = 16;
const BODY_FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const CHARS_PER_LINE = 40;

export function CollapsiblePanel(props: { title: string; body: string }) {
  // 0 = collapsed, 1 = expanded (linear time; eased below). Starts collapsed.
  const [progress, setProgress] = createSignal(0);
  let open = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const toggle = () => {
    open = !open;
    stop();
    const target = open ? 1 : 0;
    let last = Date.now();
    timer = setInterval(() => {
      const now = Date.now();
      const step = (now - last) / DURATION_MS;
      last = now;
      const current = progress();
      const next = open ? Math.min(1, current + step) : Math.max(0, current - step);
      setProgress(next);
      if (next === target) stop();
    }, FRAME_MS);
  };

  onCleanup(stop);

  // ease-in-out
  const eased = createMemo(() => {
    const t = progress();
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  });

  // No layout-measurement API is known, so the height used while animating is an estimate; once fully open the body takes its natural height.
  const estimatedHeight = createMemo(() => {
    const lines = Math.max(1, Math.ceil(props.body.length / CHARS_PER_LINE));
    return lines * LINE_HEIGHT + BODY_PADDING * 2;
  });

  const body = () => (
    <View padding={BODY_PADDING}>
      <Text fontSize={BODY_FONT_SIZE} color="#555555">
        {props.body}
      </Text>
    </View>
  );

  return (
    <View
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
          flex={{ direction: "row", align: "center", gap: 12 }}
        >
          <View grow={1}>
            <Text fontSize={16} color="#222222">
              {props.title}
            </Text>
          </View>
          {/* No rotation/transform prop is known, so the 180-degree turn is approximated by flipping the icon at the animation midpoint (single-word arrow icons used because chevron export naming is unknown). */}
          <Show when={eased() >= 0.5} fallback={<Icon data={south} />}>
            <Icon data={north} />
          </Show>
        </View>
      </GestureDetector>
      <Show when={progress() > 0}>
        <Show
          when={progress() >= 1}
          fallback={
            // No clip prop is known: the fixed-height ScrollView viewport clips the body, and the 16 inset keeps text clear of the rounded corners.
            <View height={estimatedHeight() * eased()}>
              <ScrollView>{body()}</ScrollView>
            </View>
          }
        >
          {body()}
        </Show>
      </Show>
    </View>
  );
}
