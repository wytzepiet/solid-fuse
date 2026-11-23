import { createSignal } from "solid-js";
import { RadioGroup, ScrollView, Text, View } from "solid-fuse";
import {
  ActionSheet, ActionSheetAction, ActivityIndicator, Button, Checkbox, CupertinoIcons, Dialog,
  DialogAction, ListSection, ListTile, NavigationBar, PageScaffold, Radio, SegmentedControl, Slider,
  Switch, TextField,
} from "@solid-fuse/cupertino";

export function CupertinoScreen() {
  const [on, setOn] = createSignal(false);
  const [checked, setChecked] = createSignal<boolean | null>(true);
  const [brightness, setBrightness] = createSignal(0.7);
  const [view, setView] = createSignal("day");
  const [alert, setAlert] = createSignal(false);
  const [sheet, setSheet] = createSignal(false);
  const [name, setName] = createSignal("");
  const [pick, setPick] = createSignal(1);
  const [last, setLast] = createSignal("nothing yet");

  return (
    <PageScaffold navigationBar={<NavigationBar title="Cupertino" trailing={CupertinoIcons.info} />}>
      <ScrollView flex={{ direction: "vertical", gap: 16 }} padding={{ horizontal: 16, top: 110, bottom: 32 }}>
        <SegmentedControl
          value={view()}
          onChange={setView}
          options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]}
        />
        <Text>{`view = ${view()}, last action: ${last()}`}</Text>
        <View flex={{ direction: "horizontal", gap: 8 }}>
          <Button variant="filled" onPress={() => setAlert(true)}>Alert</Button>
          <Button variant="tinted" onPress={() => setSheet(true)}>Sheet</Button>
          <Button icon={CupertinoIcons.heart}>Like</Button>
        </View>
        <TextField value={name()} onChange={setName} placeholder="Name" clearButton prefix={CupertinoIcons.person} />
        <View flex={{ direction: "horizontal", gap: 12, align: "center" }}>
          <Switch value={on()} onChange={setOn} />
          <Checkbox value={checked()} onChange={setChecked} />
          <ActivityIndicator animating={on()} />
        </View>
        <Slider value={brightness()} onChange={setBrightness} />
        <RadioGroup value={pick()} onChange={setPick}>
          <View flex={{ direction: "horizontal", gap: 8, align: "center" }}>
            <Radio value={1} /><Text>One</Text>
            <Radio value={2} /><Text>Two</Text>
          </View>
        </RadioGroup>
        <ListSection header="Settings">
          <ListTile leading={CupertinoIcons.wifi} title="Wi-Fi" additionalInfo="Home" onPress={() => setLast("wi-fi")} />
          <ListTile leading={CupertinoIcons.bluetooth} title="Bluetooth" trailing={<Switch value={on()} onChange={setOn} />} />
        </ListSection>
        {/* Modals take no space; they can sit anywhere. */}
        <Dialog
          open={alert()}
          onOpenChange={setAlert}
          title="Allow notifications?"
          actions={[
            <DialogAction onPress={() => (setLast("don't allow"), setAlert(false))}>Don't Allow</DialogAction>,
            <DialogAction default onPress={() => (setLast("allow"), setAlert(false))}>Allow</DialogAction>,
          ]}
        >
          You can change this in Settings.
        </Dialog>
        <ActionSheet
          open={sheet()}
          onOpenChange={setSheet}
          title="Share photo"
          cancel={<ActionSheetAction onPress={() => setSheet(false)}>Cancel</ActionSheetAction>}
        >
          <ActionSheetAction onPress={() => (setLast("copy"), setSheet(false))}>Copy</ActionSheetAction>
          <ActionSheetAction destructive onPress={() => (setLast("delete"), setSheet(false))}>Delete</ActionSheetAction>
        </ActionSheet>
      </ScrollView>
    </PageScaffold>
  );
}
