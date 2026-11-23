import { createSignal } from "solid-js";
import { ScrollView, Text, View } from "solid-fuse";
import { AdaptiveProvider, Button, Checkbox, Dialog, ProgressIndicator, Slider, Switch, TextField, type Design } from "@solid-fuse/adaptive";
import { Show } from "solid-js";
import { Button as Toggle } from "../ui";

// The same JSX in either design: the platform picks, or the toggle here.
export function AdaptiveScreen() {
  const [design, setDesign] = createSignal<Design>("material");
  return (
    <ScrollView flex={{ direction: "vertical", gap: 16 }} padding={{ horizontal: 16, top: 48 }}>
      <Text fontSize={24} fontWeight="bold">adaptive</Text>
      <Toggle onTap={() => setDesign(design() === "material" ? "cupertino" : "material")}>{`design: ${design()}`}</Toggle>
      <Show when={design()} keyed>
        {(d) => (
          <AdaptiveProvider design={d}>
            <Gallery />
          </AdaptiveProvider>
        )}
      </Show>
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
    <View flex={{ direction: "vertical", gap: 16 }}>
      <View flex={{ direction: "horizontal", gap: 12, align: "center" }}>
        <Switch value={on()} onChange={setOn} />
        <Checkbox value={checked()} onChange={setChecked} />
        <ProgressIndicator />
      </View>
      <Slider value={level()} onChange={setLevel} />
      <TextField label="Search" value={text()} onChange={setText} />
      <View flex={{ direction: "horizontal", gap: 8 }}>
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
