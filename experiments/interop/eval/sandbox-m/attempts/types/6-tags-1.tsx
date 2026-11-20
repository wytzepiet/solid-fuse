import { Container, For, GestureDetector, Icon, Row, Show, Text, Wrap } from "solid-fuse";
import { check } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set<string>());

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set<string>(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <Wrap spacing={8} runSpacing={8}>
      <For each={props.tags}>
        {(tag) => {
          const isSelected = () => selected().has(tag);
          return (
            <GestureDetector onTap={() => toggle(tag)}>
              <Container
                padding={{ $: "symmetric", horizontal: 12, vertical: 6 }}
                decoration={{
                  $: "BoxDecoration",
                  color: isSelected() ? INDIGO : INDIGO_LIGHT,
                  borderRadius: 999,
                }}
              >
                <Row mainAxisSize="min" spacing={4}>
                  <Show when={isSelected()}>
                    <Icon icon={check} size={14} color="white" />
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
