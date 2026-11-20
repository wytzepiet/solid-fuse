import { createSignal } from "solid-js";
import { View, Text, Stack, Positioned, GestureDetector } from "solid-fuse";

const AREA = 300;
const BORDER = 1;
const BOX = 80;
// The border is drawn inside the 300x300 area, so the usable travel is reduced by it.
const MAX = AREA - BORDER * 2 - BOX;

function clamp(v: number): number {
  return Math.max(0, Math.min(MAX, v));
}

export function DragBox(props: { onDrop?: (x: number, y: number) => void }) {
  // Raw (unclamped) position so the square keeps tracking the finger after hitting an edge.
  const [rawX, setRawX] = createSignal(0);
  const [rawY, setRawY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  const [deltaX, setDeltaX] = createSignal(0);
  const [deltaY, setDeltaY] = createSignal(0);

  const x = () => clamp(rawX());
  const y = () => clamp(rawY());

  return (
    <View flex={{ direction: "column", gap: 8, align: "start" }}>
      <View
        width={AREA}
        height={AREA}
        decoration={{
          color: "#eeeeee",
          border: { color: "#9e9e9e", width: BORDER },
        }}
      >
        <Stack>
          <Positioned left={x()} top={y()}>
            <GestureDetector
              onPanStart={() => {
                setRawX(x());
                setRawY(y());
                setDragging(true);
              }}
              onPanUpdate={(e) => {
                setDeltaX(e.dx);
                setDeltaY(e.dy);
                setRawX(rawX() + e.dx);
                setRawY(rawY() + e.dy);
              }}
              onPanEnd={() => {
                const fx = x();
                const fy = y();
                setRawX(fx);
                setRawY(fy);
                setDragging(false);
                props.onDrop?.(fx, fy);
              }}
            >
              <View
                width={BOX}
                height={BOX}
                decoration={{
                  color: dragging() ? "#ff9800" : "#2196f3",
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
