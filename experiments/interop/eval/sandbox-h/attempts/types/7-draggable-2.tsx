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
  const [dx, setDx] = createSignal(0);
  const [dy, setDy] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);

  // Plain mirrors of the position: signal writes may be batched, so handlers never read signals back.
  let posX = 0;
  let posY = 0;
  // Unclamped finger-following position, so the square re-syncs with the finger after hitting an edge.
  let rawX = 0;
  let rawY = 0;

  const begin = () => {
    rawX = posX;
    rawY = posY;
    setDragging(true);
  };

  return (
    <View flex={{ direction: "vertical", gap: 8, align: "start" }}>
      <Stack>
        <View
          width={AREA}
          height={AREA}
          decoration={{ color: "#EEEEEE", border: { width: 1, color: "grey" } }}
        />
        <Positioned left={x()} top={y()} width={BOX} height={BOX}>
          <GestureDetector
            behavior="opaque"
            onPanDown={begin}
            onPanStart={begin}
            onPanUpdate={(e) => {
              rawX += e.dx;
              rawY += e.dy;
              posX = clamp(rawX);
              posY = clamp(rawY);
              setDx(e.dx);
              setDy(e.dy);
              setX(posX);
              setY(posY);
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
              decoration={{ color: dragging() ? "orange" : "blue", borderRadius: 12 }}
            />
          </GestureDetector>
        </Positioned>
      </Stack>
      <Text fontSize={14} color="#333333" maxLines={1}>
        {`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`}
      </Text>
      <Text fontSize={14} color="#333333" maxLines={1}>
        {`${Math.round(x())}, ${Math.round(y())}`}
      </Text>
    </View>
  );
}
