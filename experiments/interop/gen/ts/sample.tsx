// Type-check only: exercises the generated prop interfaces.
//   tsc -p ts
import {
  AppBar, Container, ElevatedButton, GestureDetector, Icon, ListTile, Padding,
  Scaffold, Slider, Switch, Text, AnimatedContainer, Wrap, CupertinoButton, Opacity,
  type ContainerProps, type DragUpdateDetailsOut, type TextStyle, type EdgeInsetsGeometry,
} from "./generated/flutter";

declare const scrollFocus: import("./generated/fuse-gen-base").FuseHandle<"FocusNode">;

// Derived shapes and the "nice" overrides coexist in one union.
const padA: EdgeInsetsGeometry = 16; // override: number
const padB: EdgeInsetsGeometry = { $: "symmetric", horizontal: 12, vertical: 4 }; // derived: named ctor
const padC: EdgeInsetsGeometry = "zero"; // derived: static const
const style: TextStyle = {
  fontSize: 18,
  fontWeight: 700, // override
  color: "#3366ff", // override (hex)
  decoration: "underline", // derived static const of TextDecoration
  shadows: [{ color: "Colors.black26", offset: { dx: 0, dy: 1 }, blurRadius: 2 }],
};

export function Demo() {
  let dragged = 0;
  const onPan = (d: DragUpdateDetailsOut) => {
    dragged += d.delta.dx; // typed payload derived from DragUpdateDetails
  };
  const box: ContainerProps = {
    width: 200,
    alignment: "center", // derived static const (AlignmentGeometry.center)
    clipBehavior: "antiAlias",
    decoration: {
      $: "BoxDecoration",
      color: "white",
      borderRadius: 12, // override
      border: { $: "all", color: "#00000022", width: 1 },
      gradient: { $: "LinearGradient", colors: ["#fff", "#eee"], begin: "topLeft", end: "bottomRight" },
      boxShadow: [{ color: "Colors.black12", blurRadius: 8 }],
    },
  };
  return (
    <Scaffold
      appBar={<AppBar title={<Text>Generated</Text>} centerTitle elevation={2} backgroundColor="Colors.indigo" />}
      backgroundColor={{ $: "fromRGBO", r: 250, g: 250, b: 250, opacity: 1 }}
    >
      <Padding padding={padA}>
        <Container {...box} padding={padB} margin={padC}>
          <Text style={style} textAlign="center" maxLines={2} overflow="ellipsis">
            Hello {dragged}
          </Text>
          <GestureDetector onTap={() => {}} onPanUpdate={onPan} behavior="opaque">
            <Opacity opacity={0.5}>
              <Icon icon={{ codePoint: 0xe145 }} size={24} color="red" />
            </Opacity>
          </GestureDetector>
          <ElevatedButton onPressed={() => {}} autofocus focusNode={scrollFocus}>
            Press
          </ElevatedButton>
          <ListTile
            title={<Text>Title</Text>}
            leading={<Icon icon={{ codePoint: 0xe88a }} />}
            dense
            onTap={() => {}}
            shape={{ $: "RoundedRectangleBorder", borderRadius: 8 }}
          />
          <Switch value={true} onChanged={(v: boolean) => void v} />
          <Slider value={0.3} min={0} max={1} divisions={10} onChanged={(v) => void v.toFixed(1)} />
          <AnimatedContainer duration={300} curve="Curves.easeInOut" height={40} color="#ff0" />
          <Wrap spacing={8} alignment="spaceBetween">
            <CupertinoButton onPressed={null} pressedOpacity={0.4}>Cupertino</CupertinoButton>
          </Wrap>
        </Container>
      </Padding>
    </Scaffold>
  );
}

// Negative checks: each line must be a type error.
// @ts-expect-error unknown enum member
const bad1 = <Text textAlign="middle">x</Text>;
// @ts-expect-error required prop missing (Switch.value)
const bad2 = <Switch onChanged={() => {}} />;
// @ts-expect-error wrong callback payload type
const bad3 = <Slider value={1} onChanged={(v: string) => void v} />;
// @ts-expect-error unknown named-constructor tag
const bad4: EdgeInsetsGeometry = { $: "diagonal", value: 1 };
// @ts-expect-error missing required field of a constructor variant
const bad5: EdgeInsetsGeometry = { $: "fromLTRB", left: 1, top: 2 };
// @ts-expect-error unknown prop
const bad6 = <Opacity opacity={1} blur={3} />;
export const _neg = [bad1, bad2, bad3, bad4, bad5, bad6];
