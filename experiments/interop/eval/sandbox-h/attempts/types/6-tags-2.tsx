import { createSignal } from "solid-js";
import { For, GestureDetector, Icon, Show, Text, View } from "solid-fuse";
import { check } from "solid-fuse/icons/material";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";
const GAP = 8;

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set<string>());

  const toggle = (tag: string) => {
    const next = new Set<string>(selected());
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelected(next);
  };

  // There is no Wrap widget: the pills flow as inline widgets of a rich Text, which wraps them.
  // The 8 gap is a right/bottom margin on each pill, so the last column/row keeps 8 of trailing space.
  return (
    <Text textAlign="left" fontSize={13} lineHeight={1}>
      <For each={props.tags}>
        {(tag) => {
          const isSelected = () => selected().has(tag);
          return (
            <View margin={{ right: GAP, bottom: GAP }}>
              <GestureDetector onTap={() => toggle(tag)} behavior="opaque">
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
              </GestureDetector>
            </View>
          );
        }}
      </For>
    </Text>
  );
}
