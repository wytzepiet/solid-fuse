import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  // Selection is tracked by position so duplicate tag strings toggle independently.
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

  // No dedicated wrap layout in the primer: pills flow and wrap as inline children of a Text;
  // the 8 gap is a right/bottom margin on each pill (so the last column/row carries a trailing 8).
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
              >
                <Text
                  fontSize={13}
                  fontWeight="medium"
                  color={isSelected() ? "white" : INDIGO}
                >
                  <Show when={isSelected()}>
                    <View padding={{ right: 4 }}>
                      <Icon data={check} size={14} color="white" />
                    </View>
                  </Show>
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
