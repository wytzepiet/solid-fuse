import { Container, GestureDetector, Icon, Row, Text, Wrap } from "solid-fuse";
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

  return (
    <Wrap spacing={8} runSpacing={8}>
      {props.tags.map((tag, i) => (
        <GestureDetector onTap={() => toggle(i)}>
          <Container
            padding={{ $: "symmetric", horizontal: 12, vertical: 6 }}
            decoration={{
              $: "BoxDecoration",
              color: selected().has(i) ? INDIGO : INDIGO_LIGHT,
              borderRadius: 999,
            }}
          >
            <Row mainAxisSize="min" crossAxisAlignment="center" spacing={4}>
              {selected().has(i) ? <Icon icon={check} size={14} color="white" /> : null}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "w500",
                  color: selected().has(i) ? "white" : INDIGO,
                }}
              >
                {tag}
              </Text>
            </Row>
          </Container>
        </GestureDetector>
      ))}
    </Wrap>
  );
}
