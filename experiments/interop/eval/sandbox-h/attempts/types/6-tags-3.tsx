import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<number>>(new Set<number>());

  const toggle = (i: number) => {
    const next = new Set<number>(selected());
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  // There is no Wrap widget: pills flow as inline widgets inside a Text, which wraps them.
  // The 8 gap is each pill's right/bottom margin, so the last column/row carries 8 of trailing space.
  return (
    <Text fontSize={13} textAlign="left">
      <For each={props.tags}>
        {(tag, index) => {
          const isSelected = () => selected().has(index());
          return (
            <GestureDetector onTap={() => toggle(index())}>
              <View margin={{ right: 8, bottom: 8 }}>
                <View
                  padding={{ horizontal: 12, vertical: 6 }}
                  decoration={{
                    color: isSelected() ? INDIGO : INDIGO_LIGHT,
                    borderRadius: 999,
                  }}
                  flex={{ direction: "horizontal", gap: 4, align: "center" }}
                >
                  <Show when={isSelected()}>
                    <Icon data={check} size={14} color="white" />
                  </Show>
                  <Text
                    fontSize={13}
                    fontWeight="medium"
                    color={isSelected() ? "white" : INDIGO}
                  >
                    {tag}
                  </Text>
                </View>
              </View>
            </GestureDetector>
          );
        }}
      </For>
    </Text>
  );
}
