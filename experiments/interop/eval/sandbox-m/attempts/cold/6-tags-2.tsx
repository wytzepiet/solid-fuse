import { Container, For, GestureDetector, Icon, Row, Show, SizedBox, Text, Wrap } from "solid-fuse";
import { check } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  // Selection is tracked by position so duplicate tag strings toggle independently.
  const [selected, setSelected] = createSignal<ReadonlySet<number>>(new Set<number>());

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set<number>(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  return (
    <Wrap spacing={8} runSpacing={8}>
      <For each={props.tags}>
        {(tag, index) => {
          const isSelected = () => selected().has(index());
          return (
            <GestureDetector onTap={() => toggle(index())}>
              <Container
                padding={{ $: "symmetric", horizontal: 12, vertical: 6 }}
                decoration={{
                  $: "BoxDecoration",
                  color: isSelected() ? INDIGO : INDIGO_LIGHT,
                  borderRadius: 999,
                }}
              >
                <Row mainAxisSize="min">
                  <Show when={isSelected()}>
                    <Icon icon={check} size={14} color="white" />
                    <SizedBox width={4} />
                  </Show>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "w500",
                      color: isSelected() ? "white" : INDIGO,
                    }}
                  >
                    {tag}
                  </Text>
                </Row>
              </Container>
            </GestureDetector>
          );
        }}
      </For>
    </Wrap>
  );
}
