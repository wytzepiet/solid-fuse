import { View, Text, ScrollView, GestureDetector } from "solid-fuse";
import { createSignal } from "solid-js";

const MIN_SIZE = 12;
const MAX_SIZE = 24;
// No layout measurement is available, so the slider track uses a fixed width.
const TRACK_WIDTH = 260;
const THUMB = 22;
const TRAVEL = TRACK_WIDTH - THUMB;

function Toggle(props: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <GestureDetector onTap={() => props.onChange(!props.value)}>
      <View
        width={48}
        height={28}
        padding={3}
        flex={{ direction: "row", align: "center" }}
        decoration={{ color: props.value ? "#34C759" : "#C7C7CC", borderRadius: 14 }}
      >
        <View width={props.value ? 20 : 0} height={22} />
        <View width={22} height={22} decoration={{ color: "#FFFFFF", borderRadius: 11 }} />
      </View>
    </GestureDetector>
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  color: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "row", align: "center", gap: 12 }}
    >
      <View grow={1}>
        <Text fontSize={16} color={props.color}>
          {props.label}
        </Text>
      </View>
      <Toggle value={props.value} onChange={props.onChange} />
    </View>
  );
}

function Divider(props: { color: string }) {
  return <View height={1} margin={{ left: 16 }} decoration={{ color: props.color }} />;
}

function Slider(props: { value: number; onChange: (next: number) => void }) {
  const fraction = () => (props.value - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  const setFromX = (x: number) => {
    const f = Math.min(1, Math.max(0, (x - THUMB / 2) / TRAVEL));
    props.onChange(MIN_SIZE + f * (MAX_SIZE - MIN_SIZE));
  };
  return (
    <GestureDetector
      onTapDown={(e) => setFromX(e.localX)}
      onPanUpdate={(e) => setFromX(e.localX)}
    >
      <View width={TRACK_WIDTH} height={32} flex={{ direction: "row", align: "center" }}>
        <View
          width={fraction() * TRAVEL}
          height={4}
          decoration={{ color: "#007AFF", borderRadius: 2 }}
        />
        <View
          width={THUMB}
          height={THUMB}
          decoration={{ color: "#007AFF", borderRadius: THUMB / 2 }}
        />
        <View grow={1} height={4} decoration={{ color: "#C7C7CC", borderRadius: 2 }} />
      </View>
    </GestureDetector>
  );
}

function GroupHeading(props: { label: string }) {
  return (
    <View padding={{ left: 16, top: 24, bottom: 8 }}>
      <Text fontSize={13} color="#8E8E93">
        {props.label}
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

  const background = () => (dark() ? "#000000" : "#F2F2F7");
  const card = () => (dark() ? "#1C1C1E" : "#FFFFFF");
  const text = () => (dark() ? "#FFFFFF" : "#1C1C1E");
  const line = () => (dark() ? "#38383A" : "#E5E5EA");

  return (
    <ScrollView>
      <View
        padding={16}
        flex={{ direction: "column", align: "stretch" }}
        decoration={{ color: background() }}
      >
        <View padding={{ top: 24, left: 4 }}>
          <Text fontSize={32} color={text()}>
            Settings
          </Text>
        </View>

        <GroupHeading label="NOTIFICATIONS" />
        <View
          flex={{ direction: "column", align: "stretch" }}
          decoration={{ color: card(), borderRadius: 12 }}
        >
          <ToggleRow label="Push notifications" value={push()} color={text()} onChange={setPush} />
          <Divider color={line()} />
          <ToggleRow label="Email digest" value={email()} color={text()} onChange={setEmail} />
          <Divider color={line()} />
          <ToggleRow label="Sounds" value={sounds()} color={text()} onChange={setSounds} />
        </View>

        <GroupHeading label="DISPLAY" />
        <View
          flex={{ direction: "column", align: "stretch" }}
          decoration={{ color: card(), borderRadius: 12 }}
        >
          <View
            padding={{ horizontal: 16, vertical: 12 }}
            flex={{ direction: "column", align: "stretch", gap: 8 }}
          >
            <View flex={{ direction: "row", align: "center", gap: 12 }}>
              <View grow={1}>
                <Text fontSize={16} color={text()}>
                  Text size
                </Text>
              </View>
              <Text fontSize={16} color="#8E8E93">
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <View flex={{ direction: "row" }}>
              <Slider value={textSize()} onChange={setTextSize} />
            </View>
          </View>
          <Divider color={line()} />
          <ToggleRow label="Dark mode" value={dark()} color={text()} onChange={setDark} />
        </View>
      </View>
    </ScrollView>
  );
}
