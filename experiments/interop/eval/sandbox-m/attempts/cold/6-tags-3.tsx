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
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(
    new Set<string>(),
  );

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
    <Wrap spacing={8} runSpacing={8}>
      <For each={props.tags}>
        {(tag) => (
          <GestureDetector onTap={() => toggle(tag)}>
            <Container
              padding={{ $: "symmetric", horizontal: 12, vertical: 6 }}
              decoration={{
                $: "BoxDecoration",
                color: selected().has(tag) ? INDIGO : LIGHT_INDIGO,
                borderRadius: 999,
              }}
            >
              <Row mainAxisSize="min">
                <Show when={selected().has(tag)}>
                  <Icon icon={check} size={14} color="white" />
                </Show>
                <Show when={selected().has(tag)}>
                  <SizedBox width={4} />
                </Show>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "w500",
                    color: selected().has(tag) ? "white" : INDIGO,
                  }}
                >
                  {tag}
                </Text>
              </Row>
            </Container>
          </GestureDetector>
        )}
      </For>
    </Wrap>
  );
}
