import { createSignal } from "solid-js";
import { GestureDetector, Positioned, ScrollView, Stack, Text, View } from "solid-fuse";

const SLIDER_MIN = 12;
const SLIDER_MAX = 24;
// No layout-measurement API is known, so the slider track uses a fixed width.
const TRACK_WIDTH = 280;
const THUMB_SIZE = 24;
const SLIDER_HEIGHT = 32;

function Toggle(props: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <GestureDetector onTap={() => props.onChange(!props.value)}>
      <View
        width={50}
        height={30}
        padding={3}
        alignment="topLeft"
        decoration={{ color: props.value ? "#34C759" : "#C7C7CC", borderRadius: 15 }}
      >
        <View
          width={24}
          height={24}
          transform={{ translateX: props.value ? 20 : 0 }}
          decoration={{
            color: "white",
            shape: "circle",
            shadow: [{ blurRadius: 2, color: "#0003", offsetY: 1 }],
          }}
        />
      </View>
    </GestureDetector>
  );
}

function ToggleRow(props: {
  label: string;
  dark: boolean;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View
      padding={{ horizontal: 16, vertical: 12 }}
      flex={{ direction: "horizontal", align: "center", gap: 12 }}
    >
      <View grow={1}>
        <Text fontSize={16} color={props.dark ? "#FFFFFF" : "#1C1C1E"}>
          {props.label}
        </Text>
      </View>
      <Toggle value={props.value} onChange={props.onChange} />
    </View>
  );
}

function Divider(props: { dark: boolean }) {
  return (
    <View
      height={1}
      margin={{ left: 16 }}
      decoration={{ color: props.dark ? "#38383A" : "#E5E5EA" }}
    />
  );
}

function GroupHeading(props: { title: string }) {
  return (
    <View padding={{ left: 16, right: 16, top: 24, bottom: 8 }}>
      <Text fontSize={12} fontWeight="medium" color="#8E8E93">
        {props.title.toUpperCase()}
      </Text>
    </View>
  );
}

function Slider(props: { value: number; onChange: (next: number) => void }) {
  const fraction = () => (props.value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
  const thumbLeft = () => fraction() * (TRACK_WIDTH - THUMB_SIZE);
  const setFromX = (localX: number) => {
    const raw = (localX - THUMB_SIZE / 2) / (TRACK_WIDTH - THUMB_SIZE);
    const clamped = Math.min(1, Math.max(0, raw));
    props.onChange(Math.round(SLIDER_MIN + clamped * (SLIDER_MAX - SLIDER_MIN)));
  };
  return (
    <GestureDetector
      onTapDown={(e) => setFromX(e.localX)}
      onPanUpdate={(e) => setFromX(e.localX)}
    >
      <View width={TRACK_WIDTH} height={SLIDER_HEIGHT} decoration={{ color: "transparent" }}>
        <Stack>
          <Positioned left={0} top={0} width={TRACK_WIDTH} height={SLIDER_HEIGHT}>
            <View />
          </Positioned>
          <Positioned
            left={THUMB_SIZE / 2}
            top={(SLIDER_HEIGHT - 4) / 2}
            width={TRACK_WIDTH - THUMB_SIZE}
            height={4}
          >
            <View decoration={{ color: "#C7C7CC", borderRadius: 2 }} />
          </Positioned>
          <Positioned
            left={THUMB_SIZE / 2}
            top={(SLIDER_HEIGHT - 4) / 2}
            width={thumbLeft()}
            height={4}
          >
            <View decoration={{ color: "#007AFF", borderRadius: 2 }} />
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
  const [textSize, setTextSize] = createSignal(16);
  const [dark, setDark] = createSignal(false);

  const cardColor = () => (dark() ? "#1C1C1E" : "white");
  const textColor = () => (dark() ? "#FFFFFF" : "#1C1C1E");

  return (
    <View decoration={{ color: dark() ? "#000000" : "#F2F2F7" }}>
      <ScrollView padding={{ left: 16, right: 16, top: 48, bottom: 32 }}>
        <View padding={{ horizontal: 4 }}>
          <Text fontSize={32} fontWeight="bold" color={textColor()}>
            Settings
          </Text>
        </View>

        <GroupHeading title="Notifications" />
        <View clipBehavior="antiAlias" decoration={{ color: cardColor(), borderRadius: 12 }}>
          <ToggleRow label="Push notifications" dark={dark()} value={push()} onChange={setPush} />
          <Divider dark={dark()} />
          <ToggleRow label="Email digest" dark={dark()} value={email()} onChange={setEmail} />
          <Divider dark={dark()} />
          <ToggleRow label="Sounds" dark={dark()} value={sounds()} onChange={setSounds} />
        </View>

        <GroupHeading title="Display" />
        <View clipBehavior="antiAlias" decoration={{ color: cardColor(), borderRadius: 12 }}>
          <View padding={{ horizontal: 16, vertical: 12 }} flex={{ gap: 8 }}>
            <View flex={{ direction: "horizontal", align: "center", gap: 12 }}>
              <View grow={1}>
                <Text fontSize={16} color={textColor()}>
                  Text size
                </Text>
              </View>
              <Text fontSize={16} color="#8E8E93">
                {String(Math.round(textSize()))}
              </Text>
            </View>
            <View flex={{ direction: "horizontal", justify: "center" }}>
              <Slider value={textSize()} onChange={setTextSize} />
            </View>
          </View>
          <Divider dark={dark()} />
          <ToggleRow label="Dark mode" dark={dark()} value={dark()} onChange={setDark} />
        </View>
      </ScrollView>
    </View>
  );
}
