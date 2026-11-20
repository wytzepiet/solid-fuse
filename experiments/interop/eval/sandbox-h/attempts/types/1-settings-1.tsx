import { GestureDetector, Positioned, ScrollView, Stack, Text, View } from "solid-fuse";
import { createSignal } from "solid-js";

const ACCENT = "#2E7DF6";
const TRACK_OFF = "#D5D8DD";
const DIVIDER = "#ECEDEF";

const TEXT_MIN = 12;
const TEXT_MAX = 24;

// The API exposes no box layout measurement, so the slider uses a fixed logical width.
const SLIDER_WIDTH = 280;
const SLIDER_HEIGHT = 32;
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;

function Toggle(props: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <GestureDetector behavior="opaque" onTap={() => props.onChange(!props.value)}>
      <View
        width={50}
        height={30}
        padding={3}
        alignment={props.value ? "centerRight" : "centerLeft"}
        decoration={{ color: props.value ? ACCENT : TRACK_OFF, borderRadius: 15 }}
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
    </GestureDetector>
  );
}

function ToggleRow(props: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "horizontal", align: "center", gap: 12 }}
    >
      <View grow={1}>
        <Text fontSize={16} color="#1F2328">
          {props.label}
        </Text>
      </View>
      <Toggle value={props.value} onChange={props.onChange} />
    </View>
  );
}

function Divider() {
  return <View height={1} margin={{ left: 16 }} decoration={{ color: DIVIDER }} />;
}

function Slider(props: { value: number; min: number; max: number; onChange: (next: number) => void }) {
  const fraction = () => {
    const f = (props.value - props.min) / (props.max - props.min);
    return Math.min(1, Math.max(0, f));
  };
  const thumbLeft = () => fraction() * (SLIDER_WIDTH - THUMB_SIZE);
  const update = (localX: number) => {
    const f = (localX - THUMB_SIZE / 2) / (SLIDER_WIDTH - THUMB_SIZE);
    const clamped = Math.min(1, Math.max(0, f));
    props.onChange(Math.round(props.min + clamped * (props.max - props.min)));
  };
  const trackTop = (SLIDER_HEIGHT - TRACK_HEIGHT) / 2;

  return (
    <GestureDetector
      behavior="opaque"
      onTapDown={(e) => update(e.localX)}
      onHorizontalDragStart={(e) => update(e.localX)}
      onHorizontalDragUpdate={(e) => update(e.localX)}
    >
      <Stack>
        <View width={SLIDER_WIDTH} height={SLIDER_HEIGHT} />
        <Positioned
          left={THUMB_SIZE / 2}
          top={trackTop}
          width={SLIDER_WIDTH - THUMB_SIZE}
          height={TRACK_HEIGHT}
        >
          <View decoration={{ color: TRACK_OFF, borderRadius: TRACK_HEIGHT / 2 }} />
        </Positioned>
        <Positioned left={THUMB_SIZE / 2} top={trackTop} width={thumbLeft()} height={TRACK_HEIGHT}>
          <View decoration={{ color: ACCENT, borderRadius: TRACK_HEIGHT / 2 }} />
        </Positioned>
        <Positioned
          left={thumbLeft()}
          top={(SLIDER_HEIGHT - THUMB_SIZE) / 2}
          width={THUMB_SIZE}
          height={THUMB_SIZE}
        >
          <View
            decoration={{
              color: "white",
              shape: "circle",
              border: { width: 1, color: "#D0D3D8" },
              shadow: [{ blurRadius: 4, color: "#0003", offsetY: 1 }],
            }}
          />
        </Positioned>
      </Stack>
    </GestureDetector>
  );
}

function Group(props: { title: string; children?: unknown }) {
  return (
    <View flex={{ align: "stretch", gap: 8 }}>
      <View padding={{ left: 16 }}>
        <Text fontSize={12} fontWeight="semiBold" letterSpacing={0.8} color="#7A7F87">
          {props.title.toUpperCase()}
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
  const [email, setEmail] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [textSize, setTextSize] = createSignal(16);
  const [darkMode, setDarkMode] = createSignal(false);

  return (
    <View decoration={{ color: "#F2F3F5" }} flex={{ align: "stretch", expand: true }}>
      <View grow={1}>
        <ScrollView padding={{ horizontal: 16, top: 56, bottom: 32 }} flex={{ align: "stretch", gap: 24 }}>
          <Text fontSize={32} fontWeight="bold" color="#1F2328">
            Settings
          </Text>

          <Group title="Notifications">
            <ToggleRow label="Push notifications" value={push()} onChange={(v) => setPush(v)} />
            <Divider />
            <ToggleRow label="Email digest" value={email()} onChange={(v) => setEmail(v)} />
            <Divider />
            <ToggleRow label="Sounds" value={sounds()} onChange={(v) => setSounds(v)} />
          </Group>

          <Group title="Display">
            <View padding={{ horizontal: 16, top: 12, bottom: 8 }} flex={{ align: "stretch", gap: 6 }}>
              <View flex={{ direction: "horizontal", align: "center", gap: 12 }}>
                <View grow={1}>
                  <Text fontSize={16} color="#1F2328">
                    Text size
                  </Text>
                </View>
                <Text fontSize={16} fontWeight="medium" color="#7A7F87">
                  {String(Math.round(textSize()))}
                </Text>
              </View>
              <View alignment="center">
                <Slider
                  value={textSize()}
                  min={TEXT_MIN}
                  max={TEXT_MAX}
                  onChange={(v) => setTextSize(v)}
                />
              </View>
            </View>
            <Divider />
            <ToggleRow label="Dark mode" value={darkMode()} onChange={(v) => setDarkMode(v)} />
          </Group>
        </ScrollView>
      </View>
    </View>
  );
}
