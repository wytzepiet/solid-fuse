# Generated Flutter widgets

Every component exported from `solid-fuse` is generated 1:1 from a Flutter widget
constructor. Component names are the Flutter class names (`Container`, `Row`, `ListTile`);
a named constructor is concatenated (`Image.network` -> `ImageNetwork`,
`Transform.translate` -> `TransformTranslate`). Props are the constructor's parameters
under the same names. The full typed surface is `lib/solid-fuse/evalm.d.ts`
(props interfaces first, then enums, then value types in alphabetical order).

## Conventions

- **children**: `child` / `children` are JSX children. Other widget-typed parameters
  (`title`, `leading`, `appBar`, `firstChild`, ...) are props that take a JSX element.
  `Text`'s positional `data` string is its JSX child.
- **enum** -> its member name as a string: `mainAxisAlignment="spaceBetween"`.
- **static const** -> a string: `"name"` when the constant lives on the parameter's own
  class (`alignment="center"`, `fontWeight="w600"`), `"Owner.name"` when it lives on a
  namespace class or subclass (`"Curves.easeInOut"`, `"Colors.black54"`, `"Alignment.center"`).
- **class** -> an object keyed by constructor parameter name (positional ones too):
  `{ dx: 0, dy: 2 }` for `Offset(0, 2)`. A named constructor or a subclass is selected
  with `$`: `{ $: "symmetric", horizontal: 8 }`, `{ $: "LinearGradient", colors: [...] }`,
  `{ $: "BoxDecoration", color: "white" }`. When a type has an unnamed constructor of its
  own, the object without `$` is that constructor.
- **callback** -> a function; the payload is the single argument (Flutter's details
  object as plain data, e.g. `DragUpdateDetailsOut` with `delta: { dx, dy }`), or an
  array for several arguments. `BuildContext` arguments are not sent. A nullable callback
  such as `onPressed` may be `null` (disabled).
- **controllers / focus nodes** -> handles (`FuseHandle<...>`); not needed for ordinary use.

## Friendly codecs layered on the derived shapes

| Type | Also accepts |
|---|---|
| `Color` | `"red"`-style names, CSS hex `#RGB` / `#RRGGBB` / `#RRGGBBAA`, `{ r, g, b, a? }`, `{ h, s, l, a? }` |
| `EdgeInsets` / `EdgeInsetsGeometry` | a number (all sides) |
| `BorderRadius` / `BorderRadiusGeometry` / `Radius` | a number (circular, all corners) |
| `Duration` | a number of milliseconds |
| `FontWeight` | `100`..`900` |
| `IconData` | the values exported by `solid-fuse/icons/material` and `solid-fuse/icons/cupertino` |

## Example

```tsx
import { createSignal } from "solid-js";
import { Scaffold, AppBar, Padding, Container, Text, GestureDetector, Opacity, Icon,
  ElevatedButton, ListTile, Switch, Slider, AnimatedContainer, Wrap } from "solid-fuse";
import { add, home } from "solid-fuse/icons/material";

export function Demo() {
  const [on, setOn] = createSignal(false);
  return (
    <Scaffold
      appBar={<AppBar title={<Text>Generated</Text>} centerTitle elevation={2} backgroundColor="Colors.indigo" />}
      backgroundColor={{ $: "fromRGBO", r: 250, g: 250, b: 250, opacity: 1 }}
    >
      <Padding padding={16}>
        <Container
          width={200}
          alignment="center"
          clipBehavior="antiAlias"
          padding={{ $: "symmetric", horizontal: 12, vertical: 4 }}
          decoration={{
            $: "BoxDecoration",
            color: "white",
            borderRadius: 12,
            border: { $: "all", color: "#00000022", width: 1 },
            gradient: { $: "LinearGradient", colors: ["#fff", "#eee"], begin: "topLeft", end: "bottomRight" },
            boxShadow: [{ color: "Colors.black12", blurRadius: 8 }],
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: 700, color: "#3366ff", decoration: "underline" }}
            textAlign="center" maxLines={2} overflow="ellipsis"
          >
            Hello
          </Text>
        </Container>
      </Padding>
      <GestureDetector onTap={() => {}} onPanUpdate={(d) => console.log(d.delta.dx)} behavior="opaque">
        <Opacity opacity={0.5}><Icon icon={add} size={24} color="red" /></Opacity>
      </GestureDetector>
      <ElevatedButton onPressed={() => {}}><Text>Press</Text></ElevatedButton>
      <ListTile title={<Text>Title</Text>} leading={<Icon icon={home} />} dense onTap={() => {}}
        shape={{ $: "RoundedRectangleBorder", borderRadius: 8 }} />
      <Switch value={on()} onChanged={setOn} />
      <Slider value={0.3} min={0} max={1} divisions={10} onChanged={(v) => console.log(v)} />
      <AnimatedContainer duration={300} curve="Curves.easeInOut" height={40} color="#ff0" />
      <Wrap spacing={8} alignment="spaceBetween"><Text>a</Text><Text>b</Text></Wrap>
    </Scaffold>
  );
}
```
