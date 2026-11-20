import { GestureDetector, Positioned, Stack, Text, View } from "solid-fuse";
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

  // Plain mirrors of the position so handlers never depend on signal flush timing.
  let px = 0;
  let py = 0;

  const end = () => {
    setDragging(false);
    props.onDrop?.(px, py);
  };

  return (
    <View flex={{ gap: 8, align: "start" }}>
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
              onPanStart={() => setDragging(true)}
              onPanUpdate={(e) => {
                px = clamp(px + e.dx);
                py = clamp(py + e.dy);
                setX(px);
                setY(py);
                setDx(e.dx);
                setDy(e.dy);
              }}
              onPanEnd={end}
              onPanCancel={end}
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
      <Text fontSize={14} maxLines={1}>
        {`Δ ${dx().toFixed(1)}, ${dy().toFixed(1)}`}
      </Text>
      <Text fontSize={14} maxLines={1}>
        {`${Math.round(x())}, ${Math.round(y())}`}
      </Text>
    </View>
  );
}
