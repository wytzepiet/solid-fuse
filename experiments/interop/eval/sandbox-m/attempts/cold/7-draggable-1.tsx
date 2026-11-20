import { Column, Container, GestureDetector, Positioned, SizedBox, Stack, Text } from "solid-fuse";
import { createSignal } from "solid-js";

const AREA = 300;
const BOX = 80;
const MAX = AREA - BOX;

function clamp(v: number): number {
  return Math.min(MAX, Math.max(0, v));
}

export function DragBox(props: { onDrop?: (x: number, y: number) => void }) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [dx, setDx] = createSignal(0);
  const [dy, setDy] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);

  // Unclamped finger-tracking position, so the square re-syncs with the finger after hitting an edge.
  let rawX = 0;
  let rawY = 0;

  return (
    <Column mainAxisSize="min" crossAxisAlignment="start">
      <SizedBox width={AREA} height={AREA}>
        <Stack>
          <Container
            width={AREA}
            height={AREA}
            decoration={{
              $: "BoxDecoration",
              color: "#EEEEEE",
              border: { $: "all", color: "grey", width: 1 },
            }}
          />
          <Positioned left={x()} top={y()} width={BOX} height={BOX}>
            <GestureDetector
              onPanStart={() => {
                rawX = x();
                rawY = y();
                setDragging(true);
              }}
              onPanUpdate={(d) => {
                const ddx: number = d.delta.dx;
                const ddy: number = d.delta.dy;
                rawX += ddx;
                rawY += ddy;
                setDx(ddx);
                setDy(ddy);
                setX(clamp(rawX));
                setY(clamp(rawY));
              }}
              onPanEnd={() => {
                setDragging(false);
                props.onDrop?.(x(), y());
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
      </SizedBox>
      <SizedBox height={8} />
      <Text>{`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`}</Text>
      <Text>{`${Math.round(x())}, ${Math.round(y())}`}</Text>
    </Column>
  );
}
