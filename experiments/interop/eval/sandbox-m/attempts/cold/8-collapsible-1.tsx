import {
  AnimatedAlign,
  AnimatedRotation,
  ClipRect,
  ClipRRect,
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

const DURATION = 250;
const CURVE = "Curves.easeInOut";

export function CollapsiblePanel(props: { title: string; body: string }) {
  const [open, setOpen] = createSignal(false);

  return (
    <Container
      decoration={{
        $: "BoxDecoration",
        color: "white",
        borderRadius: 12,
        border: { $: "all", color: "#DDDDDD", width: 1 },
      }}
    >
      {/* Inner radius = outer radius (12) minus the border width (1). */}
      <ClipRRect borderRadius={11} clipBehavior="antiAlias">
        <Column mainAxisSize="min" crossAxisAlignment="stretch">
          <GestureDetector behavior="opaque" onTap={() => setOpen(!open())}>
            <Padding padding={{ $: "symmetric", horizontal: 16, vertical: 14 }}>
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
                  duration={DURATION}
                  curve={CURVE}
                >
                  <Icon icon={expandMore} size={24} color="#555555" />
                </AnimatedRotation>
              </Row>
            </Padding>
          </GestureDetector>
          <ClipRect>
            <AnimatedAlign
              alignment="topLeft"
              heightFactor={open() ? 1 : 0}
              duration={DURATION}
              curve={CURVE}
            >
              <Padding padding={16}>
                <Text style={{ fontSize: 14, height: 1.4, color: "#444444" }}>
                  {props.body}
                </Text>
              </Padding>
            </AnimatedAlign>
          </ClipRect>
        </Column>
      </ClipRRect>
    </Container>
  );
}
