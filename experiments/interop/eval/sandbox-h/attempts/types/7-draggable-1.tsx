import { GestureDetector, Positioned, Stack, Text, View } from "solid-fuse";
import { createSignal } from "solid-js";

const AREA = 300;
const BOX = 80;
const MAX = AREA - BOX;

function clamp(value: number): number {
  return Math.min(MAX, Math.max(0, value));
}

export function DragBox(props: { onDrop?: (x: number, y: number) => void }) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [deltaX, setDeltaX] = createSignal(0);
  const [deltaY, setDeltaY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);

  // Plain mirrors of the position so handlers never depend on signal flush timing.
  // The raw (unclamped) values keep the square aligned with the finger after it
  // has been pushed against an edge.
  let posX = 0;
  let posY = 0;
  let rawX = 0;
  let rawY = 0;

  return (
    <View flex={{ direction: "vertical", gap: 8, align: "start" }}>
      <View width={AREA} height={AREA}>
        <Stack fit="expand">
          <Positioned top={0} left={0} right={0} bottom={0}>
            <View
              decoration={{
                color: "#EEEEEE",
                border: { width: 1, color: "grey" },
              }}
            />
          </Positioned>
          <Positioned left={x()} top={y()} width={BOX} height={BOX}>
            <GestureDetector
              behavior="opaque"
              onPanDown={() => {
                rawX = posX;
                rawY = posY;
                setDragging(true);
              }}
              onPanUpdate={(e) => {
                rawX += e.dx;
                rawY += e.dy;
                posX = clamp(rawX);
                posY = clamp(rawY);
                setX(posX);
                setY(posY);
                setDeltaX(e.dx);
                setDeltaY(e.dy);
              }}
              onPanEnd={() => {
                setDragging(false);
                props.onDrop?.(posX, posY);
              }}
              onPanCancel={() => {
                setDragging(false);
              }}
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
        {`Δ ${deltaX().toFixed(1)}, ${deltaY().toFixed(1)}`}
      </Text>
      <Text fontSize={14} color="#333333" maxLines={1}>
        {`${Math.round(x())}, ${Math.round(y())}`}
      </Text>
    </View>
  );
}
