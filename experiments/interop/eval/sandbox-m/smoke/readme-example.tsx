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
