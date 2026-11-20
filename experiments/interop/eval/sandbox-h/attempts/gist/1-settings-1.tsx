import { createSignal } from "solid-js";
import { View, Text, ScrollView, Stack, Positioned, GestureDetector } from "solid-fuse";

const MIN_SIZE = 12;
const MAX_SIZE = 24;
// The slider track has a fixed width: the primer exposes no way to measure a widget's laid-out width.
const TRACK_WIDTH = 260;
const THUMB = 24;
const USABLE = TRACK_WIDTH - THUMB;

function Toggle(props: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <GestureDetector onTap={() => props.onChange(!props.value)}>
      <View
        width={48}
        height={28}
        padding={3}
        flex={{ direction: "row", align: "center" }}
        decoration={{ color: props.value ? "#34C759" : "#D1D1D6", borderRadius: 14 }}
      >
        <View width={props.value ? 20 : 0} height={1} />
        <View width={22} height={22} decoration={{ color: "#FFFFFF", borderRadius: 11 }} />
      </View>
    </GestureDetector>
  );
}

function ToggleRow(props: { label: string }) {
  const [on, setOn] = createSignal(false);
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "row", align: "center", gap: 12 }}
    >
      <View grow={1} flex={{ direction: "row" }}>
        <Text fontSize={16} color="#1C1C1E">
          {props.label}
        </Text>
      </View>
      <Toggle value={on()} onChange={setOn} />
    </View>
  );
}

function Divider() {
  return (
    <View padding={{ left: 16 }}>
      <View height={1} decoration={{ color: "#E5E5EA" }} />
    </View>
  );
}

function GroupHeading(props: { title: string }) {
  return (
    <View flex={{ direction: "row" }} padding={{ left: 16, top: 8, bottom: 6 }}>
      <Text fontSize={12} color="#8E8E93">
        {props.title.toUpperCase()}
      </Text>
    </View>
  );
}

function TextSizeRow() {
  const [size, setSize] = createSignal(16);

  const setFromX = (x: number) => {
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / USABLE));
    setSize(Math.round(MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE)));
  };

  const thumbLeft = () => ((size() - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * USABLE;

  return (
    <View padding={{ horizontal: 16, vertical: 12 }} flex={{ direction: "column", gap: 10 }}>
      <View flex={{ direction: "row", align: "center", gap: 12 }}>
        <View grow={1} flex={{ direction: "row" }}>
          <Text fontSize={16} color="#1C1C1E">
            Text size
          </Text>
        </View>
        <Text fontSize={16} color="#8E8E93">
          {String(Math.round(size()))}
        </Text>
      </View>
      <View flex={{ direction: "row" }}>
        <GestureDetector
          onTapDown={(e) => setFromX(e.localX)}
          onHorizontalDragUpdate={(e) => setFromX(e.localX)}
        >
          <View width={TRACK_WIDTH} height={THUMB}>
            <Stack>
              <Positioned left={THUMB / 2} top={(THUMB - 4) / 2}>
                <View
                  width={USABLE}
                  height={4}
                  decoration={{ color: "#D1D1D6", borderRadius: 2 }}
                />
              </Positioned>
              <Positioned left={THUMB / 2} top={(THUMB - 4) / 2}>
                <View
                  width={thumbLeft()}
                  height={4}
                  decoration={{ color: "#007AFF", borderRadius: 2 }}
                />
              </Positioned>
              <Positioned left={thumbLeft()} top={0}>
                <View
                  width={THUMB}
                  height={THUMB}
                  decoration={{ color: "#007AFF", borderRadius: THUMB / 2 }}
                />
              </Positioned>
            </Stack>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  return (
    <View grow={1} decoration={{ color: "#F2F2F7" }}>
      <ScrollView>
        <View padding={16} flex={{ direction: "column", gap: 8 }}>
          <View flex={{ direction: "row" }} padding={{ top: 16, bottom: 8 }}>
            <Text fontSize={30} fontWeight="bold" color="#000000">
              Settings
            </Text>
          </View>

          <GroupHeading title="Notifications" />
          <View
            flex={{ direction: "column" }}
            decoration={{ color: "#FFFFFF", borderRadius: 12 }}
          >
            <ToggleRow label="Push notifications" />
            <Divider />
            <ToggleRow label="Email digest" />
            <Divider />
            <ToggleRow label="Sounds" />
          </View>

          <GroupHeading title="Display" />
          <View
            flex={{ direction: "column" }}
            decoration={{ color: "#FFFFFF", borderRadius: 12 }}
          >
            <TextSizeRow />
            <Divider />
            <ToggleRow label="Dark mode" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
