import { createSignal } from "solid-js";
import {
  Container,
  For,
  GestureDetector,
  Icon,
  Row,
  Show,
  SizedBox,
  Text,
  Wrap,
} from "solid-fuse";
import { check } from "solid-fuse/icons/material";

const INDIGO = "#3F51B5";
const LIGHT_INDIGO = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  const [selected, setSelected] = createSignal<ReadonlySet<number>>(
    new Set<number>(),
  );

  const toggle = (i: number) => {
    const next = new Set<number>(selected());
    if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
    }
    setSelected(next);
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
                  color: isSelected() ? INDIGO : LIGHT_INDIGO,
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
