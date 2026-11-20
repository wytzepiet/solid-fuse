import { GestureDetector, Icon, ScrollView, Show, Text, View } from "solid-fuse";
// Single-word arrow used as the chevron (multi-word icon export casing is not known from the primer).
import { south } from "solid-fuse/icons/material";
import { createMemo, createSignal, onCleanup } from "solid-js";

const DURATION_MS = 250;
const FRAME_MS = 16;
const BODY_PADDING = 16;
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 20;
// No layout-measurement API is known, so the animated height targets an estimate
// (assumes ~42 characters per line); the fully open state uses the natural height.
const CHARS_PER_LINE = 42;

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);
  // 0 = collapsed, 1 = fully open.
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
    const distance = target - from;
    const duration = Math.abs(distance) * DURATION_MS;
    if (duration <= 0) {
      setProgress(target);
      return;
    }
    const started = Date.now();
    timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / duration);
      setProgress(t >= 1 ? target : from + distance * t);
      if (t >= 1) stop();
    }, FRAME_MS);
  };

  onCleanup(stop);

  const toggle = () => {
    const next = !open();
    setOpen(next);
    animateTo(next ? 1 : 0);
  };

  // Smoothstep easing, shared by the height and the chevron so they stay in sync.
  const eased = createMemo(() => {
    const p = progress();
    return p * p * (3 - 2 * p);
  });

  const estimatedHeight = createMemo(() => {
    const lines = Math.max(1, Math.ceil(props.body.length / CHARS_PER_LINE));
    return lines * BODY_LINE_HEIGHT + BODY_PADDING * 2;
  });

  // Rotation prop name is a guess (radians); passed via spread so it reaches the widget untouched.
  const chevronRotation = {
    get rotate(): number {
      return eased() * Math.PI;
    },
  };

  const bodyContent = () => (
    <View padding={BODY_PADDING}>
      <Text fontSize={BODY_FONT_SIZE} color="#444444">
        {props.body}
      </Text>
    </View>
  );

  return (
    <View
      flex={{ direction: "column" }}
      decoration={{
        color: "#ffffff",
        borderRadius: 12,
        border: { color: "#d9d9d9", width: 1 },
      }}
    >
      <GestureDetector onTap={toggle}>
        <View
          flex={{ direction: "row", align: "center", gap: 12 }}
          padding={{ horizontal: 16, vertical: 14 }}
        >
          <View grow={1}>
            <Text fontSize={16} color="#111111">
              {props.title}
            </Text>
          </View>
          <View {...chevronRotation}>
            <Icon data={south} />
          </View>
        </View>
      </GestureDetector>
      <Show when={progress() > 0}>
        <Show when={progress() < 1} fallback={bodyContent()}>
          {/* The ScrollView viewport clips the body while its height animates; the text is inset 16,
              beyond the 12 corner radius, so nothing can paint outside the rounded corners. */}
          <View height={estimatedHeight() * eased()}>
            <ScrollView>{bodyContent()}</ScrollView>
          </View>
        </Show>
      </Show>
    </View>
  );
}
