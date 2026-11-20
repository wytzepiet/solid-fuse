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
        border: { $: "all", color: "#E0E0E0", width: 1 },
        borderRadius: 12,
      }}
    >
      <Column mainAxisSize="min" crossAxisAlignment="stretch">
        <GestureDetector behavior="opaque" onTap={() => setOpen((v) => !v)}>
          <Padding padding={16}>
            <Row>
              <Expanded>
                <Text data={props.title} style={{ fontSize: 16 }} />
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
              <Text data={props.body} />
            </Padding>
          </AnimatedAlign>
        </ClipRect>
      </Column>
    </Container>
  );
}
