import { Container, GestureDetector, Icon, Row, Text, Wrap } from "solid-fuse";
import { check } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

const INDIGO = "#3F51B5";
const INDIGO_LIGHT = "#E8EAF6";

export function TagCloud(props: { tags: string[] }) {
  // Selection is tracked by position so duplicate tag strings toggle independently.
  const [selected, setSelected] = createSignal<readonly number[]>([]);

  const isSelected = (index: number): boolean => selected().includes(index);

  const toggle = (index: number): void => {
    const current = selected();
    setSelected(
      current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index],
    );
  };

  return (
    <Wrap spacing={8} runSpacing={8}>
      {props.tags.map((tag, index) => (
        <GestureDetector behavior="opaque" onTap={() => toggle(index)}>
          <Container
            padding={{ $: "symmetric", horizontal: 12, vertical: 6 }}
            decoration={{
              $: "BoxDecoration",
              color: isSelected(index) ? INDIGO : INDIGO_LIGHT,
              borderRadius: 999,
            }}
          >
            <Row mainAxisSize="min" crossAxisAlignment="center" spacing={4}>
              {isSelected(index) ? (
                <Icon icon={check} size={14} color="white" />
              ) : null}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isSelected(index) ? "white" : INDIGO,
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
