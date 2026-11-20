import { View, Text, ScrollView, GestureDetector } from "solid-fuse";
import { createSignal } from "solid-js";

const TRACK_WIDTH = 280;
const THUMB = 22;
const MIN_SIZE = 12;
const MAX_SIZE = 24;

function Toggle(props: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <GestureDetector onTap={() => props.onChange(!props.value)}>
      <View
        width={46}
        height={28}
        padding={3}
        flex={{ direction: "row", align: "center" }}
        decoration={{ color: props.value ? "#34C759" : "#C7C7CC", borderRadius: 14 }}
      >
        <View width={props.value ? 18 : 0} height={22} />
        <View width={22} height={22} decoration={{ color: "#FFFFFF", borderRadius: 11 }} />
      </View>
    </GestureDetector>
  );
}

function ToggleRow(props: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "row", align: "center", gap: 12 }}
    >
      <View grow={1}>
        <Text fontSize={16} color="#1C1C1E">
          {props.label}
        </Text>
      </View>
      <Toggle value={props.value} onChange={props.onChange} />
    </View>
  );
}

function Slider(props: { value: number; onChange: (next: number) => void }) {
  const fraction = () => (props.value - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  const setFromX = (x: number) => {
    const f = Math.min(1, Math.max(0, (x - THUMB / 2) / (TRACK_WIDTH - THUMB)));
    props.onChange(Math.round(MIN_SIZE + f * (MAX_SIZE - MIN_SIZE)));
  };
  // The track has a fixed width because the primer exposes no way to measure layout.
  return (
    <GestureDetector onPanUpdate={(e) => setFromX(e.localX)}>
      <View width={TRACK_WIDTH} height={32} flex={{ direction: "row", align: "center" }}>
        <View
          width={fraction() * (TRACK_WIDTH - THUMB)}
          height={4}
          decoration={{ color: "#007AFF", borderRadius: 2 }}
        />
        <View
          width={THUMB}
          height={THUMB}
          decoration={{
            color: "#FFFFFF",
            borderRadius: THUMB / 2,
            border: { color: "#007AFF", width: 2 },
          }}
        />
        <View grow={1} height={4} decoration={{ color: "#D1D1D6", borderRadius: 2 }} />
      </View>
    </GestureDetector>
  );
}

function GroupHeading(props: { title: string }) {
  return (
    <View padding={{ left: 16, bottom: 6 }}>
      <Text fontSize={12} color="#8E8E93">
        {props.title.toUpperCase()}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const [push, setPush] = createSignal(true);
  const [email, setEmail] = createSignal(false);
  const [sounds, setSounds] = createSignal(true);
  const [textSize, setTextSize] = createSignal(16);
  const [dark, setDark] = createSignal(false);

  return (
    <ScrollView>
      <View padding={16} flex={{ direction: "column", gap: 8 }} decoration={{ color: "#F2F2F7" }}>
        <View padding={{ top: 24, bottom: 16, left: 4 }}>
          <Text fontSize={32} color="#000000">
            Settings
          </Text>
        </View>

        <GroupHeading title="Notifications" />
        <View flex={{ direction: "column" }} decoration={{ color: "#FFFFFF", borderRadius: 12 }}>
          <ToggleRow label="Push notifications" value={push()} onChange={setPush} />
          <ToggleRow label="Email digest" value={email()} onChange={setEmail} />
          <ToggleRow label="Sounds" value={sounds()} onChange={setSounds} />
        </View>

        <View height={16} />

        <GroupHeading title="Display" />
        <View flex={{ direction: "column" }} decoration={{ color: "#FFFFFF", borderRadius: 12 }}>
          <View padding={{ horizontal: 16, vertical: 12 }} flex={{ direction: "column", gap: 8 }}>
            <View flex={{ direction: "row", align: "center", gap: 12 }}>
              <View grow={1}>
                <Text fontSize={16} color="#1C1C1E">
                  Text size
                </Text>
              </View>
              <Text fontSize={16} color="#8E8E93">
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <Slider value={textSize()} onChange={setTextSize} />
          </View>
          <ToggleRow label="Dark mode" value={dark()} onChange={setDark} />
        </View>
      </View>
    </ScrollView>
  );
}
