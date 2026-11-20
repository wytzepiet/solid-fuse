import { createSignal } from "solid-js";
import { GestureDetector, Positioned, Stack, Text, View } from "solid-fuse";

const AREA = 300;
const BOX = 80;
const MAX = AREA - BOX;

const clamp = (v: number): number => Math.max(0, Math.min(MAX, v));

export function DragBox(props: { onDrop?: (x: number, y: number) => void }) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  const [deltaX, setDeltaX] = createSignal(0);
  const [deltaY, setDeltaY] = createSignal(0);

  // Unclamped finger-following position, so the square re-attaches to the
  // finger at the right spot after the finger wanders outside the area.
  let rawX = 0;
  let rawY = 0;

  const finish = () => {
    if (!dragging()) return;
    setDragging(false);
    props.onDrop?.(x(), y());
  };

  return (
    <View flex={{ direction: "column", gap: 8 }}>
      <View width={AREA} height={AREA}>
        <Stack>
          <Positioned left={0} top={0}>
            <View
              width={AREA}
              height={AREA}
              decoration={{
                color: "#EEEEEE",
                border: { color: "#9E9E9E", width: 1 },
              }}
            />
          </Positioned>
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
                setDeltaX(e.dx);
                setDeltaY(e.dy);
                setX(clamp(rawX));
                setY(clamp(rawY));
              }}
              onPanEnd={() => finish()}
              onPanCancel={() => finish()}
            >
              <View
                width={BOX}
                height={BOX}
                decoration={{
                  color: dragging() ? "#FF9800" : "#2196F3",
                  borderRadius: 12,
                }}
              />
            </GestureDetector>
          </Positioned>
        </Stack>
      </View>
      <Text fontSize={14} color="#333333">
        {`Δ ${deltaX().toFixed(1)}, ${deltaY().toFixed(1)}`}
      </Text>
      <Text fontSize={14} color="#333333">
        {`${Math.round(x())}, ${Math.round(y())}`}
      </Text>
    </View>
  );
}
