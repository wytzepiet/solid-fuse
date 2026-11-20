import {
  AnimatedAlign,
  AnimatedRotation,
  ClipRect,
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
        borderRadius: 12,
        border: { $: "all", color: "#DDDDDD", width: 1 },
      }}
    >
      <Column mainAxisSize="min" crossAxisAlignment="stretch">
        <GestureDetector behavior="opaque" onTap={() => setOpen((v) => !v)}>
          <Padding padding={16}>
            <Row>
              <Expanded>
                <Text style={{ fontSize: 16, fontWeight: "w600", color: "#222222" }}>
                  {props.title}
                </Text>
              </Expanded>
              <AnimatedRotation
                turns={open() ? 0.5 : 0}
                duration={250}
                curve="Curves.easeInOut"
              >
                <Icon icon={expandMore} size={24} color="#555555" />
              </AnimatedRotation>
            </Row>
          </Padding>
        </GestureDetector>
        <ClipRect>
          <AnimatedAlign
            alignment="topCenter"
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
        </ClipRect>
      </Column>
    </Container>
  );
}
