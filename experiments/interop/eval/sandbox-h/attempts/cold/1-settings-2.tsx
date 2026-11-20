import { GestureDetector, Positioned, ScrollView, Stack, Text, View } from "solid-fuse";
import { createSignal } from "solid-js";

const TRACK_WIDTH = 280;
const THUMB = 24;
const MIN_SIZE = 12;
const MAX_SIZE = 24;

const cardDecoration = {
  color: "white",
  borderRadius: 12,
  shadow: [{ blurRadius: 6, color: "#00000014", offsetY: 1 }],
};

function GroupHeading(props: { title: string }) {
  return (
    <View padding={{ left: 12, right: 12, top: 0, bottom: 6 }}>
      <Text fontSize={12} fontWeight="semiBold" color="#8A8A8E">
        {props.title.toUpperCase()}
      </Text>
    </View>
  );
}

function Divider() {
  return <View height={1} margin={{ left: 16, right: 0, top: 0, bottom: 0 }} decoration={{ color: "#EEEEEE" }} />;
}

function Toggle(props: { value: boolean; onToggle: () => void }) {
  return (
    <GestureDetector onTap={() => props.onToggle()}>
      <View
        width={48}
        height={28}
        padding={2}
        alignment={props.value ? "centerRight" : "centerLeft"}
        decoration={{ color: props.value ? "#34C759" : "#D1D1D6", borderRadius: 14 }}
      >
        <View
          width={24}
          height={24}
          decoration={{
            color: "white",
            shape: "circle",
            shadow: [{ blurRadius: 2, color: "#00000033", offsetY: 1 }],
          }}
        />
      </View>
    </GestureDetector>
  );
}

function ToggleRow(props: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "horizontal", align: "center", gap: 12 }}
    >
      <View grow={1}>
        <Text fontSize={16} color="#1C1C1E">
          {props.label}
        </Text>
      </View>
      <Toggle value={props.value} onToggle={props.onToggle} />
    </View>
  );
}

function Slider(props: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const fraction = () => {
    const f = (props.value - props.min) / (props.max - props.min);
    return Math.max(0, Math.min(1, f));
  };
  const thumbLeft = () => fraction() * (TRACK_WIDTH - THUMB);
  const setFromX = (x: number) => {
    const f = Math.max(0, Math.min(1, (x - THUMB / 2) / (TRACK_WIDTH - THUMB)));
    props.onChange(props.min + f * (props.max - props.min));
  };
  // The track has a fixed width because the laid-out width cannot be measured from here.
  return (
    <GestureDetector onPanUpdate={(e) => setFromX(e.localX)}>
      <View width={TRACK_WIDTH} height={28}>
        <Stack>
          <Positioned left={0} top={12} width={TRACK_WIDTH} height={4}>
            <View decoration={{ color: "#E0E0E5", borderRadius: 2 }} />
          </Positioned>
          <Positioned left={0} top={12} width={thumbLeft() + THUMB / 2} height={4}>
            <View decoration={{ color: "#007AFF", borderRadius: 2 }} />
          </Positioned>
          <Positioned left={thumbLeft()} top={2} width={THUMB} height={THUMB}>
            <View
              decoration={{
                color: "white",
                shape: "circle",
                border: { width: 1, color: "#D1D1D6" },
                shadow: [{ blurRadius: 3, color: "#00000033", offsetY: 1 }],
              }}
            />
          </Positioned>
        </Stack>
      </View>
    </GestureDetector>
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
      <ScrollView padding={{ horizontal: 16, vertical: 24 }}>
        <View padding={{ left: 4, right: 4, top: 0, bottom: 20 }}>
          <Text fontSize={32} fontWeight="bold" color="#1C1C1E">
            Settings
          </Text>
        </View>

        <GroupHeading title="Notifications" />
        <View decoration={cardDecoration} clipBehavior="antiAlias">
          <ToggleRow label="Push notifications" value={push()} onToggle={() => setPush(!push())} />
          <Divider />
          <ToggleRow label="Email digest" value={digest()} onToggle={() => setDigest(!digest())} />
          <Divider />
          <ToggleRow label="Sounds" value={sounds()} onToggle={() => setSounds(!sounds())} />
        </View>

        <View height={24} />

        <GroupHeading title="Display" />
        <View decoration={cardDecoration} clipBehavior="antiAlias">
          <View padding={{ horizontal: 16, vertical: 12 }} flex={{ gap: 8 }}>
            <View flex={{ direction: "horizontal", align: "center", justify: "spaceBetween" }}>
              <Text fontSize={16} color="#1C1C1E">
                Text size
              </Text>
              <Text fontSize={16} fontWeight="medium" color="#8A8A8E">
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <Slider value={textSize()} min={MIN_SIZE} max={MAX_SIZE} onChange={(v) => setTextSize(v)} />
          </View>
          <Divider />
          <ToggleRow label="Dark mode" value={dark()} onToggle={() => setDark(!dark())} />
        </View>
      </ScrollView>
    </View>
  );
}
