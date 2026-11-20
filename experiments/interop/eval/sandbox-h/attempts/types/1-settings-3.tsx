import { GestureDetector, Positioned, ScrollView, Stack, Text, View } from "solid-fuse";
import { createSignal } from "solid-js";
import type { JSX } from "solid-js";

const ACCENT = "#3B82F6";
const DIVIDER = "#EEEEF0";

const MIN_SIZE = 12;
const MAX_SIZE = 24;
// The framework exposes no way to measure a laid-out width, so the slider track has a fixed width.
const SLIDER_WIDTH = 264;
const THUMB = 24;
const SLIDER_HEIGHT = 36;
const TRACK_HEIGHT = 4;
const TRAVEL = SLIDER_WIDTH - THUMB;

function Toggle(props: { value: boolean }) {
  return (
    <View
      width={50}
      height={30}
      padding={3}
      alignment={props.value ? "centerRight" : "centerLeft"}
      decoration={{ color: props.value ? ACCENT : "#D1D5DB", borderRadius: 15 }}
    >
      <View
        width={24}
        height={24}
        decoration={{
          color: "white",
          shape: "circle",
          shadow: [{ blurRadius: 3, color: "#0003", offsetY: 1 }],
        }}
      />
    </View>
  );
}

function ToggleRow(props: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <GestureDetector behavior="opaque" onTap={() => props.onToggle()}>
      <View
        padding={{ horizontal: 16, vertical: 12 }}
        flex={{ direction: "horizontal", align: "center", gap: 12 }}
      >
        <View grow={1}>
          <Text fontSize={16} color="#1F2937">
            {props.label}
          </Text>
        </View>
        <Toggle value={props.value} />
      </View>
    </GestureDetector>
  );
}

function Slider(props: { value: number; onChange: (value: number) => void }) {
  const fraction = () =>
    Math.min(1, Math.max(0, (props.value - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)));
  const setFromX = (localX: number) => {
    const f = Math.min(1, Math.max(0, (localX - THUMB / 2) / TRAVEL));
    props.onChange(MIN_SIZE + f * (MAX_SIZE - MIN_SIZE));
  };
  const trackTop = (SLIDER_HEIGHT - TRACK_HEIGHT) / 2;

  return (
    <GestureDetector
      behavior="opaque"
      onTapDown={(e) => setFromX(e.localX)}
      onHorizontalDragStart={(e) => setFromX(e.localX)}
      onHorizontalDragUpdate={(e) => setFromX(e.localX)}
    >
      <View width={SLIDER_WIDTH} height={SLIDER_HEIGHT}>
        <Stack>
          <Positioned left={THUMB / 2} top={trackTop} width={TRAVEL} height={TRACK_HEIGHT}>
            <View decoration={{ color: "#D1D5DB", borderRadius: TRACK_HEIGHT / 2 }} />
          </Positioned>
          <Positioned
            left={THUMB / 2}
            top={trackTop}
            width={fraction() * TRAVEL}
            height={TRACK_HEIGHT}
          >
            <View decoration={{ color: ACCENT, borderRadius: TRACK_HEIGHT / 2 }} />
          </Positioned>
          <Positioned
            left={fraction() * TRAVEL}
            top={(SLIDER_HEIGHT - THUMB) / 2}
            width={THUMB}
            height={THUMB}
          >
            <View
              decoration={{
                color: "white",
                shape: "circle",
                border: { width: 2, color: ACCENT },
                shadow: [{ blurRadius: 4, color: "#0003", offsetY: 1 }],
              }}
            />
          </Positioned>
        </Stack>
      </View>
    </GestureDetector>
  );
}

function Divider() {
  return <View height={1} margin={{ left: 16 }} decoration={{ color: DIVIDER }} />;
}

function Group(props: { heading: string; children: JSX.Element }) {
  return (
    <View flex={{ gap: 8, align: "stretch" }}>
      <View padding={{ horizontal: 16 }}>
        <Text fontSize={12} fontWeight="semiBold" letterSpacing={0.8} color="#6B7280">
          {props.heading.toUpperCase()}
        </Text>
      </View>
      <View
        clipBehavior="antiAlias"
        decoration={{
          color: "white",
          borderRadius: 14,
          shadow: [{ blurRadius: 6, color: "#0000000F", offsetY: 1 }],
        }}
        flex={{ align: "stretch" }}
      >
        {props.children}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const [push, setPush] = createSignal(true);
  const [digest, setDigest] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [dark, setDark] = createSignal(false);
  const [textSize, setTextSize] = createSignal(16);

  return (
    <View decoration={{ color: "#F2F2F7" }}>
      <ScrollView
        padding={{ horizontal: 16, top: 56, bottom: 32 }}
        flex={{ gap: 24, align: "stretch" }}
      >
        <View padding={{ horizontal: 4 }}>
          <Text fontSize={32} fontWeight="bold" color="#111827">
            Settings
          </Text>
        </View>

        <Group heading="Notifications">
          <ToggleRow
            label="Push notifications"
            value={push()}
            onToggle={() => setPush((v) => !v)}
          />
          <Divider />
          <ToggleRow
            label="Email digest"
            value={digest()}
            onToggle={() => setDigest((v) => !v)}
          />
          <Divider />
          <ToggleRow label="Sounds" value={sounds()} onToggle={() => setSounds((v) => !v)} />
        </Group>

        <Group heading="Display">
          <View padding={{ horizontal: 16, top: 12, bottom: 8 }} flex={{ gap: 4, align: "stretch" }}>
            <View flex={{ direction: "horizontal", align: "center", gap: 12 }}>
              <View grow={1}>
                <Text fontSize={16} color="#1F2937">
                  Text size
                </Text>
              </View>
              <Text fontSize={16} fontWeight="medium" color="#6B7280">
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <View alignment="center">
              <Slider value={textSize()} onChange={setTextSize} />
            </View>
          </View>
          <Divider />
          <ToggleRow label="Dark mode" value={dark()} onToggle={() => setDark((v) => !v)} />
        </Group>
      </ScrollView>
    </View>
  );
}
