import { View, Text, ScrollView, Stack, Positioned, GestureDetector } from "solid-fuse";
import { createSignal } from "solid-js";

const MIN_SIZE = 12;
const MAX_SIZE = 24;
// The slider track has a fixed width: there is no way to measure laid-out width from the primer.
const TRACK_WIDTH = 280;
const THUMB = 24;

function Toggle(props: { value: boolean; onToggle: () => void }) {
  return (
    <GestureDetector onTap={() => props.onToggle()}>
      <View
        width={52}
        height={32}
        padding={3}
        alignment={props.value ? "centerRight" : "centerLeft"}
        decoration={{ color: props.value ? "#34C759" : "#D1D1D6", borderRadius: 16 }}
      >
        <View
          width={26}
          height={26}
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

function Divider() {
  return <View height={1} margin={{ left: 16 }} decoration={{ color: "#E5E5EA" }} />;
}

function GroupHeading(props: { title: string }) {
  return (
    <View padding={{ left: 16, bottom: 8 }}>
      <Text fontSize={13} fontWeight="medium" color="#8E8E93">
        {props.title.toUpperCase()}
      </Text>
    </View>
  );
}

function Slider(props: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const fraction = () => (props.value - props.min) / (props.max - props.min);
  const thumbLeft = () => fraction() * (TRACK_WIDTH - THUMB);
  return (
    <GestureDetector
      onPanUpdate={(e) => {
        const f = Math.min(1, Math.max(0, (e.localX - THUMB / 2) / (TRACK_WIDTH - THUMB)));
        props.onChange(props.min + f * (props.max - props.min));
      }}
    >
      <View width={TRACK_WIDTH} height={32} decoration={{ color: "transparent" }}>
        <Stack>
          <Positioned left={0} top={14} width={TRACK_WIDTH} height={4}>
            <View decoration={{ color: "#D1D1D6", borderRadius: 2 }} />
          </Positioned>
          <Positioned left={0} top={14} width={thumbLeft() + THUMB / 2} height={4}>
            <View decoration={{ color: "#007AFF", borderRadius: 2 }} />
          </Positioned>
          <Positioned left={thumbLeft()} top={4} width={THUMB} height={THUMB}>
            <View
              decoration={{
                color: "white",
                shape: "circle",
                border: { width: 1, color: "#D1D1D6" },
                shadow: [{ blurRadius: 4, color: "#0003", offsetY: 1 }],
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
  const [email, setEmail] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [dark, setDark] = createSignal(false);
  const [textSize, setTextSize] = createSignal(16);

  return (
    <View decoration={{ color: "#F2F2F7" }}>
      <ScrollView padding={16}>
        <View padding={{ top: 24, bottom: 24, left: 4 }}>
          <Text fontSize={32} fontWeight="bold" color="#1C1C1E">
            Settings
          </Text>
        </View>

        <GroupHeading title="Notifications" />
        <View
          margin={{ bottom: 28 }}
          clipBehavior="antiAlias"
          decoration={{ color: "white", borderRadius: 12 }}
        >
          <ToggleRow label="Push notifications" value={push()} onToggle={() => setPush(!push())} />
          <Divider />
          <ToggleRow label="Email digest" value={email()} onToggle={() => setEmail(!email())} />
          <Divider />
          <ToggleRow label="Sounds" value={sounds()} onToggle={() => setSounds(!sounds())} />
        </View>

        <GroupHeading title="Display" />
        <View
          margin={{ bottom: 28 }}
          clipBehavior="antiAlias"
          decoration={{ color: "white", borderRadius: 12 }}
        >
          <View padding={{ horizontal: 16, vertical: 12 }} flex={{ gap: 8 }}>
            <View flex={{ direction: "horizontal", align: "center", gap: 12 }}>
              <View grow={1}>
                <Text fontSize={16} color="#1C1C1E">
                  Text size
                </Text>
              </View>
              <Text fontSize={16} fontWeight="medium" color="#8E8E93">
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <View alignment="center">
              <Slider
                value={textSize()}
                min={MIN_SIZE}
                max={MAX_SIZE}
                onChange={(v) => setTextSize(v)}
              />
            </View>
          </View>
          <Divider />
          <ToggleRow label="Dark mode" value={dark()} onToggle={() => setDark(!dark())} />
        </View>
      </ScrollView>
    </View>
  );
}
