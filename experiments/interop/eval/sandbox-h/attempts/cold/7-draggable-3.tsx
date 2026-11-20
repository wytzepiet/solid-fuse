import { createSignal } from "solid-js";
import { GestureDetector, Positioned, Stack, Text, View } from "solid-fuse";

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

  // Unclamped finger-following position, so the square re-aligns with the finger after hitting an edge.
  let rawX = 0;
  let rawY = 0;

  const end = () => {
    if (!dragging()) return;
    setDragging(false);
    props.onDrop?.(x(), y());
  };

  return (
    <View flex={{ direction: "vertical", gap: 8, align: "start" }}>
      <View width={AREA} height={AREA}>
        <Stack>
          <Positioned top={0} left={0} width={AREA} height={AREA}>
            <View
              width={AREA}
              height={AREA}
              decoration={{
                color: "#EEEEEE",
                border: { width: 1, color: "grey" },
              }}
            />
          </Positioned>
          <Positioned left={x()} top={y()} width={BOX} height={BOX}>
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
              onPanEnd={() => end()}
              onPanCancel={() => end()}
            >
              <View
                width={BOX}
                height={BOX}
                decoration={{
                  color: dragging() ? "orange" : "blue",
                  borderRadius: 12,
                }}
              />
            </GestureDetector>
          </Positioned>
        </Stack>
      </View>
      <Text fontSize={14} color="#333333" maxLines={1}>
        {`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`}
      </Text>
      <Text fontSize={14} color="#333333" maxLines={1}>
        {`${Math.round(x())}, ${Math.round(y())}`}
      </Text>
    </View>
  );
}
