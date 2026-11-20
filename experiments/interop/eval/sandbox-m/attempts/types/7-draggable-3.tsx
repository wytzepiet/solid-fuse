import { createSignal } from "solid-js";
import { Column, Container, GestureDetector, Positioned, SizedBox, Stack, Text } from "solid-fuse";

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

  // Plain mirrors of the state so handlers never depend on signal flush timing.
  // rawX/rawY follow the finger unclamped, so the square re-syncs with the finger
  // after it has been pushed against an edge.
  let rawX = 0;
  let rawY = 0;
  let curX = 0;
  let curY = 0;

  return (
    <Column mainAxisSize="min" crossAxisAlignment="start">
      <Container
        width={AREA}
        height={AREA}
        color="#EEEEEE"
        foregroundDecoration={{
          $: "BoxDecoration",
          border: { $: "all", color: "grey", width: 1 },
        }}
      >
        <Stack>
          <Positioned left={x()} top={y()} width={BOX} height={BOX}>
            <GestureDetector
              behavior="opaque"
              onPanStart={() => {
                rawX = curX;
                rawY = curY;
                setDragging(true);
              }}
              onPanUpdate={(d) => {
                rawX += d.delta.dx;
                rawY += d.delta.dy;
                curX = clamp(rawX);
                curY = clamp(rawY);
                setX(curX);
                setY(curY);
                setDx(d.delta.dx);
                setDy(d.delta.dy);
                setDragging(true);
              }}
              onPanEnd={() => {
                setDragging(false);
                props.onDrop?.(curX, curY);
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
      <SizedBox height={8} />
      <Text>{`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`}</Text>
      <Text>{`${Math.round(x())}, ${Math.round(y())}`}</Text>
    </Column>
  );
}
