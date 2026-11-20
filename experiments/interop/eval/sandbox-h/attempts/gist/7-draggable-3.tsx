import { View, Text, Stack, Positioned, GestureDetector } from "solid-fuse";
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

  // Unclamped finger-following position, so the square re-syncs with the finger after hitting an edge.
  let rawX = 0;
  let rawY = 0;

  return (
    <View flex={{ direction: "column", gap: 8 }}>
      <View width={AREA} height={AREA}>
        <Stack>
          <View
            width={AREA}
            height={AREA}
            decoration={{ color: "#eeeeee", border: { color: "#9e9e9e", width: 1 } }}
          />
          <Positioned left={x()} top={y()}>
            <GestureDetector
              onPanStart={() => {
                rawX = x();
                rawY = y();
                setDragging(true);
              }}
              onPanUpdate={(e) => {
                rawX += e.dx;
                rawY += e.dy;
                setDx(e.dx);
                setDy(e.dy);
                setX(clamp(rawX));
                setY(clamp(rawY));
              }}
              onPanEnd={() => {
                setDragging(false);
                props.onDrop?.(x(), y());
              }}
            >
              <View
                width={BOX}
                height={BOX}
                decoration={{ color: dragging() ? "#ff9800" : "#2196f3", borderRadius: 12 }}
              />
            </GestureDetector>
          </Positioned>
        </Stack>
      </View>
      <Text fontSize={14} color="#333333">{`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`}</Text>
      <Text fontSize={14} color="#333333">{`${Math.round(x())}, ${Math.round(y())}`}</Text>
    </View>
  );
}
