import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

const INDIGO = "#4F46E5";
const INDIGO_LIGHT = "#E0E7FF";

const row: "row" = "row";
const center: "center" = "center";

// Wrapping relies on the flex `wrap` flag (gap applies to both axes); it is not in the primer, so it is passed via a pre-built object.
const cloudFlex = { direction: row, gap: 8, wrap: true };
const pillFlex = { direction: row, gap: 4, align: center };

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<readonly number[]>([]);

  const isSelected = (i: number): boolean => selected().includes(i);

  const toggle = (i: number): void => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  return (
    <View flex={cloudFlex}>
      <For each={props.tags}>
        {(tag, index) => (
          <GestureDetector onTap={() => toggle(index())}>
            <View
              flex={pillFlex}
              padding={{ horizontal: 12, vertical: 6 }}
              decoration={{
                color: isSelected(index()) ? INDIGO : INDIGO_LIGHT,
                borderRadius: 999,
              }}
            >
              <Show when={isSelected(index())}>
                <Icon data={check} size={14} color="#FFFFFF" />
              </Show>
              <Text
                fontSize={13}
                fontWeight={500}
                color={isSelected(index()) ? "#FFFFFF" : INDIGO}
              >
                {tag}
              </Text>
            </View>
          </GestureDetector>
        )}
      </For>
    </View>
  );
}
