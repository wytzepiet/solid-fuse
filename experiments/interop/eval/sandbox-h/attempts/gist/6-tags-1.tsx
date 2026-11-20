import { createSignal } from "solid-js";
import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";

const INDIGO = "#4F46E5";
const INDIGO_LIGHT = "#E0E7FF";

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set<string>());

  const toggle = (tag: string) => {
    const next = new Set<string>(selected());
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setSelected(next);
  };

  return (
    // `wrap: true` makes the row flow onto new lines; `gap` applies between pills and between lines.
    <View flex={{ direction: "row", wrap: true, gap: 8 }}>
      <For each={props.tags}>
        {(tag) => {
          const isSelected = () => selected().has(tag);
          return (
            <GestureDetector onTap={() => toggle(tag)}>
              <View
                padding={{ horizontal: 12, vertical: 6 }}
                decoration={{
                  color: isSelected() ? INDIGO : INDIGO_LIGHT,
                  borderRadius: 999,
                }}
                flex={{ direction: "row", gap: 4, align: "center" }}
              >
                <Show when={isSelected()}>
                  <Icon data={check} size={14} color="white" />
                </Show>
                <Text
                  fontSize={13}
                  fontWeight={500}
                  color={isSelected() ? "white" : INDIGO}
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
