import { GestureDetector, Positioned, ScrollView, Stack, Text, View } from "solid-fuse";
import { createSignal } from "solid-js";

const ACCENT = "#2E7DF6";
const MIN_SIZE = 12;
const MAX_SIZE = 24;
// No layout measurement is available, so the slider track has a fixed width.
const TRACK_WIDTH = 260;
const THUMB = 24;

interface Palette {
  background: string;
  card: string;
  text: string;
  heading: string;
  divider: string;
  trackOff: string;
}

const LIGHT: Palette = {
  background: "#F2F2F7",
  card: "#FFFFFF",
  text: "#1C1C1E",
  heading: "#8E8E93",
  divider: "#E5E5EA",
  trackOff: "#D1D1D6",
};

const DARK: Palette = {
  background: "#000000",
  card: "#1C1C1E",
  text: "#FFFFFF",
  heading: "#8E8E93",
  divider: "#38383A",
  trackOff: "#48484A",
};

function Toggle(props: { value: boolean; onChange: (next: boolean) => void; palette: Palette }) {
  return (
    <GestureDetector onTap={() => props.onChange(!props.value)} behavior="opaque">
      <View
        width={48}
        height={28}
        padding={2}
        alignment={props.value ? "centerRight" : "centerLeft"}
        decoration={{ color: props.value ? ACCENT : props.palette.trackOff, borderRadius: 14 }}
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

function ToggleRow(props: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  palette: Palette;
}) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "horizontal", align: "center", justify: "spaceBetween", gap: 12, expand: true }}
    >
      <View grow={1}>
        <Text fontSize={16} color={props.palette.text}>
          {props.label}
        </Text>
      </View>
      <Toggle value={props.value} onChange={props.onChange} palette={props.palette} />
    </View>
  );
}

function Slider(props: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  palette: Palette;
}) {
  const travel = TRACK_WIDTH - THUMB;
  const fraction = () =>
    Math.min(1, Math.max(0, (props.value - props.min) / (props.max - props.min)));
  const setFromX = (localX: number) => {
    const f = Math.min(1, Math.max(0, (localX - THUMB / 2) / travel));
    props.onChange(props.min + f * (props.max - props.min));
  };
  return (
    <GestureDetector
      behavior="opaque"
      onTapDown={(e) => setFromX(e.localX)}
      onHorizontalDragStart={(e) => setFromX(e.localX)}
      onHorizontalDragUpdate={(e) => setFromX(e.localX)}
    >
      <View width={TRACK_WIDTH} height={32}>
        <Stack>
          <Positioned left={THUMB / 2} top={14} width={travel} height={4}>
            <View decoration={{ color: props.palette.trackOff, borderRadius: 2 }} />
          </Positioned>
          <Positioned left={THUMB / 2} top={14} width={fraction() * travel} height={4}>
            <View decoration={{ color: ACCENT, borderRadius: 2 }} />
          </Positioned>
          <Positioned left={fraction() * travel} top={4} width={THUMB} height={THUMB}>
            <View
              decoration={{
                color: "white",
                shape: "circle",
                border: { width: 1, color: "#00000014" },
                shadow: [{ blurRadius: 4, color: "#0004", offsetY: 1 }],
              }}
            />
          </Positioned>
        </Stack>
      </View>
    </GestureDetector>
  );
}

function Divider(props: { palette: Palette }) {
  return <View height={1} margin={{ left: 16 }} decoration={{ color: props.palette.divider }} />;
}

function Group(props: { title: string; palette: Palette; children?: JSX.Element }) {
  return (
    <View flex={{ gap: 8, align: "stretch" }}>
      <View padding={{ horizontal: 16 }}>
        <Text fontSize={12} fontWeight="medium" letterSpacing={0.8} color={props.palette.heading}>
          {props.title.toUpperCase()}
        </Text>
      </View>
      <View
        clipBehavior="antiAlias"
        decoration={{ color: props.palette.card, borderRadius: 12 }}
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

  const palette = () => (dark() ? DARK : LIGHT);

  return (
    <View decoration={{ color: palette().background }}>
      <ScrollView padding={{ horizontal: 16, vertical: 24 }} flex={{ gap: 24, align: "stretch" }}>
        <View padding={{ horizontal: 16, top: 16 }}>
          <Text fontSize={32} fontWeight="bold" color={palette().text}>
            Settings
          </Text>
        </View>

        <Group title="Notifications" palette={palette()}>
          <ToggleRow label="Push notifications" value={push()} onChange={setPush} palette={palette()} />
          <Divider palette={palette()} />
          <ToggleRow label="Email digest" value={digest()} onChange={setDigest} palette={palette()} />
          <Divider palette={palette()} />
          <ToggleRow label="Sounds" value={sounds()} onChange={setSounds} palette={palette()} />
        </Group>

        <Group title="Display" palette={palette()}>
          <View padding={{ horizontal: 16, vertical: 12 }} flex={{ gap: 8, align: "stretch" }}>
            <View flex={{ direction: "horizontal", align: "center", justify: "spaceBetween", expand: true }}>
              <Text fontSize={16} color={palette().text}>
                Text size
              </Text>
              <Text fontSize={16} fontWeight="medium" color={palette().heading}>
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <View alignment="center">
              <Slider
                value={textSize()}
                min={MIN_SIZE}
                max={MAX_SIZE}
                onChange={setTextSize}
                palette={palette()}
              />
            </View>
          </View>
          <Divider palette={palette()} />
          <ToggleRow label="Dark mode" value={dark()} onChange={setDark} palette={palette()} />
        </Group>
      </ScrollView>
    </View>
  );
}
