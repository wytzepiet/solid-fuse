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

const DURATION_MS = 250;

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
        <GestureDetector behavior="opaque" onTap={() => setOpen(!open())}>
          <Padding padding={16}>
            <Row mainAxisAlignment="spaceBetween">
              <Expanded>
                <Text data={props.title} style={{ fontSize: 16, fontWeight: "bold" }} />
              </Expanded>
              <AnimatedRotation turns={open() ? 0.5 : 0} duration={DURATION_MS}>
                <Icon icon={expandMore} />
              </AnimatedRotation>
            </Row>
          </Padding>
        </GestureDetector>
        <ClipRect>
          <AnimatedAlign
            alignment="topCenter"
            heightFactor={open() ? 1 : 0}
            duration={DURATION_MS}
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
