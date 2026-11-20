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
import { expand_more } from "solid-fuse/icons/material";
import { createSignal } from "solid-js";

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);

  return (
    <Container
      clipBehavior="antiAlias"
      decoration={{
        $: "BoxDecoration",
        border: { $: "all", color: "#D3D3D3", width: 1 },
        borderRadius: 12,
      }}
    >
      <Column mainAxisSize="min" crossAxisAlignment="stretch">
        <GestureDetector behavior="opaque" onTap={() => setOpen(!open())}>
          <Padding padding={16}>
            <Row>
              <Expanded>
                <Text style={{ fontSize: 16 }}>{props.title}</Text>
              </Expanded>
              <AnimatedRotation
                turns={open() ? 0.5 : 0}
                duration={250}
                curve="Curves.easeInOut"
              >
                <Icon icon={expand_more} />
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
              <Text>{props.body}</Text>
            </Padding>
          </AnimatedAlign>
        </ClipRect>
      </Column>
    </Container>
  );
}
