import { createSignal } from "solid-js";
import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";

const INDIGO = "#4F46E5";
const INDIGO_LIGHT = "#E0E7FF";

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<number>>(new Set<number>());

  const toggle = (i: number) => {
    const next = new Set<number>(selected());
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  return (
    // Wrapping relies on the flex `wrap` option; `gap` is used for both the horizontal and vertical spacing.
    <View flex={{ direction: "row", wrap: true, gap: 8 }}>
      <For each={props.tags}>
        {(tag, index) => {
          const isSelected = () => selected().has(index());
          return (
            <GestureDetector onTap={() => toggle(index())}>
              <View
                padding={{ horizontal: 12, vertical: 6 }}
                decoration={{
                  color: isSelected() ? INDIGO : INDIGO_LIGHT,
                  borderRadius: 999,
                }}
                flex={{ direction: "row", gap: 4, align: "center" }}
              >
                <Show when={isSelected()}>
                  <Icon data={check} size={14} color="#FFFFFF" />
                </Show>
                <Text
                  fontSize={13}
                  fontWeight={500}
                  color={isSelected() ? "#FFFFFF" : INDIGO}
                >
                  {tag}
                </Text>
              </View>
            </GestureDetector>
          );
        }}
      </For>
    </View>
  );
}
