import {
  AnimatedAlign,
  AnimatedRotation,
  Column,
  Container,
  Expanded,
  GestureDetector,
  Icon,
  Padding,
  Row,
  Text,
} from "solid-fuse";
import { expandMore } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);

  return (
    <Container
      clipBehavior="antiAlias"
      decoration={{
        $: "BoxDecoration",
        color: "white",
        border: { $: "all", color: "#E0E0E0", width: 1 },
        borderRadius: 12,
      }}
    >
      <Column mainAxisSize="min" crossAxisAlignment="stretch">
        <GestureDetector behavior="opaque" onTap={() => setOpen(!open())}>
          <Padding padding={16}>
            <Row crossAxisAlignment="center">
              <Expanded>
                <Text
                  overflow="ellipsis"
                  maxLines={1}
                  style={{ fontSize: 16, fontWeight: "w600", color: "#222222" }}
                >
                  {props.title}
                </Text>
              </Expanded>
              <AnimatedRotation
                turns={open() ? 0.5 : 0}
                duration={250}
                curve="Curves.easeInOut"
              >
                <Icon icon={expandMore} size={24} color="#616161" />
              </AnimatedRotation>
            </Row>
          </Padding>
        </GestureDetector>
        <AnimatedAlign
          alignment="topLeft"
          heightFactor={open() ? 1 : 0}
          duration={250}
          curve="Curves.easeInOut"
        >
          <Padding padding={16}>
            <Text style={{ fontSize: 14, height: 1.4, color: "#444444" }}>
              {props.body}
            </Text>
          </Padding>
        </AnimatedAlign>
      </Column>
    </Container>
  );
}
