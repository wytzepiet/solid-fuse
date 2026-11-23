import { createSignal } from "solid-js";
import { ScrollView, Text, View } from "solid-fuse";
import { Button, Checkbox, Dialog, ProgressIndicator, Slider, Switch, TextField, useDesign } from "@solid-fuse/adaptive";
import { Button as Toggle } from "../ui";
import { setPlatform } from "../platform";

// The same JSX in either design. The toggle switches the whole app's
// platform; the components restyle in place and keep their state.
export function AdaptiveScreen() {
  const design = useDesign();
  return (
    <ScrollView layout={{ direction: "vertical", gap: 16 }} padding={{ horizontal: 16, top: 48 }}>
      <Text fontSize={24} fontWeight={700}>adaptive</Text>
      <Toggle onTap={() => setPlatform(design() === "material" ? "iOS" : "android")}>{`design: ${design()}`}</Toggle>
      <Gallery />
    </ScrollView>
  );
}

function Gallery() {
  const [on, setOn] = createSignal(true);
  const [checked, setChecked] = createSignal<boolean | null>(false);
  const [level, setLevel] = createSignal(0.5);
  const [text, setText] = createSignal("");
  const [open, setOpen] = createSignal(false);
  return (
    <View layout={{ direction: "vertical", gap: 16 }}>
      <View layout={{ direction: "horizontal", gap: 12, align: "center" }}>
        <Switch value={on()} onChange={setOn} />
        <Checkbox value={checked()} onChange={setChecked} />
        <ProgressIndicator />
      </View>
      <Slider value={level()} onChange={setLevel} />
      <TextField label="Search" value={text()} onChange={setText} />
      <View layout={{ direction: "horizontal", gap: 8 }}>
        <Button onPress={() => setOpen(true)}>Delete</Button>
        <Button variant="plain">Later</Button>
      </View>
      <Dialog
        open={open()}
        onOpenChange={setOpen}
        title="Delete item?"
        actions={[
          { label: "Cancel", onPress: () => setOpen(false) },
          { label: "Delete", destructive: true, onPress: () => setOpen(false) },
        ]}
      >
        This can't be undone.
      </Dialog>
    </View>
  );
}
