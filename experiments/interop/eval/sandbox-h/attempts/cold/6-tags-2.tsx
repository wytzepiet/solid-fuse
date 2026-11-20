import { createSignal } from "solid-js";
import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<number>>(new Set<number>());

  const toggle = (i: number) => {
    const next = new Set<number>(selected());
    if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
    }
    setSelected(next);
  };

  // No wrap layout in the primer: pills are inline children of a Text so they wrap with it;
  // the 8 gap is a right/bottom margin per pill (leaves 8 of trailing space on each line / at the end).
  return (
    <Text>
      <For each={props.tags}>
        {(tag, index) => {
          const isSelected = () => selected().has(index());
          return (
            <GestureDetector onTap={() => toggle(index())}>
              <View
                margin={{ right: 8, bottom: 8 }}
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
            </GestureDetector>
          );
        }}
      </For>
    </Text>
  );
}
