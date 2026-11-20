import { Column, Container, GestureDetector, Positioned, Stack, Text } from "solid-fuse";
import { createSignal } from "solid-js";

const AREA = 300;
const BORDER = 1;
const BOX = 80;
// The border is drawn inside the 300x300 area, so the square's travel is the inner 298x298.
const MAX = AREA - BORDER * 2 - BOX;

const clamp = (v: number): number => Math.min(MAX, Math.max(0, v));

export function DragBox(props: { onDrop?: (x: number, y: number) => void }) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [dx, setDx] = createSignal(0);
  const [dy, setDy] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);

  // Unclamped finger-following position, so the square re-syncs with the
  // finger after it has been pushed against an edge.
  let rawX = 0;
  let rawY = 0;

  return (
    <Column mainAxisSize="min" crossAxisAlignment="start">
      <Container
        width={AREA}
        height={AREA}
        decoration={{
          $: "BoxDecoration",
          color: "#EEEEEE",
          border: { $: "all", color: "grey", width: BORDER },
        }}
      >
        <Stack>
          <Positioned left={x()} top={y()}>
            <GestureDetector
              onPanStart={() => {
                rawX = x();
                rawY = y();
                setDragging(true);
              }}
              onPanUpdate={(details) => {
                const ddx: number = details.delta.dx;
                const ddy: number = details.delta.dy;
                rawX += ddx;
                rawY += ddy;
                setDx(ddx);
                setDy(ddy);
                setX(clamp(rawX));
                setY(clamp(rawY));
              }}
              onPanEnd={() => {
                setDragging(false);
                props.onDrop?.(clamp(rawX), clamp(rawY));
              }}
              onPanCancel={() => {
                setDragging(false);
              }}
            >
              <Container
                width={BOX}
                height={BOX}
                decoration={{
                  $: "BoxDecoration",
                  color: dragging() ? "orange" : "blue",
                  borderRadius: 12,
                }}
              />
            </GestureDetector>
          </Positioned>
        </Stack>
      </Container>
      <Text data={`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`} />
      <Text data={`${Math.round(x())}, ${Math.round(y())}`} />
    </Column>
  );
}
