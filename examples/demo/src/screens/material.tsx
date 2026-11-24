import { createSignal } from "solid-js";
import { RadioGroup, ScrollView, Text, View, useNav } from "solid-fuse";
import {
  AppBar, Badge, BottomSheet, Button, Card, Checkbox, Chip, Dialog, Divider, FloatingActionButton,
  IconButton, Icons, ListTile, NavigationBar, NavigationDestination, ProgressIndicator, Radio,
  Scaffold, Slider, Switch, TextField,
} from "@solid-fuse/material";

export function MaterialScreen() {
  const nav = useNav();
  const [on, setOn] = createSignal(true);
  const [checked, setChecked] = createSignal<boolean | null>(false);
  const [volume, setVolume] = createSignal(0.4);
  const [plan, setPlan] = createSignal("free");
  const [tab, setTab] = createSignal(0);
  const [dialog, setDialog] = createSignal(false);
  const [sheet, setSheet] = createSignal(false);
  const [email, setEmail] = createSignal("");
  const [taps, setTaps] = createSignal(0);
  const [filter, setFilter] = createSignal(false);

  return (
    <Scaffold
      appBar={
        <AppBar
          title="Material"
          leading={<IconButton icon={Icons.arrow_back} tooltip="Back" onPress={() => nav.pop()} />}
          actions={<IconButton icon={Icons.settings} tooltip="Settings" />}
        />
      }
      floatingActionButton={<FloatingActionButton icon={Icons.add} tooltip="Add" onPress={() => setTaps((n) => n + 1)} />}
      bottomNavigationBar={
        <NavigationBar selected={tab()} onSelect={setTab}>
          <NavigationDestination icon={Icons.home_outlined} selectedIcon={Icons.home} label="Home" />
          <NavigationDestination icon={Icons.favorite_border} selectedIcon={Icons.favorite} label="Saved" />
          <NavigationDestination icon={Icons.person_outline} selectedIcon={Icons.person} label="Profile" />
        </NavigationBar>
      }
    >
      <ScrollView layout={{ direction: "vertical", gap: 16 }} padding={16}>
        <Text>{`Tab ${tab()}, FAB pressed ${taps()} times`}</Text>
        <View layout={{ direction: "horizontal", gap: 8 }}>
          <Button onPress={() => setDialog(true)}>Dialog</Button>
          <Button variant="tonal" onPress={() => setSheet(true)}>Sheet</Button>
          <Button variant="outlined" icon={Icons.send}>Send</Button>
        </View>
        <View layout={{ direction: "horizontal", gap: 8 }}>
          <Button variant="text">Text</Button>
          <Button variant="elevated">Elevated</Button>
          <Button disabled>Disabled</Button>
        </View>
        <Divider />
        <View layout={{ direction: "horizontal", gap: 8, align: "center" }}>
          <Switch value={on()} onChange={setOn} />
          <Checkbox value={checked()} onChange={setChecked} tristate />
          <Text>{`switch ${on() ? "on" : "off"}, checkbox ${String(checked())}`}</Text>
        </View>
        <Slider value={volume()} onChange={setVolume} />
        <RadioGroup value={plan()} onChange={setPlan}>
          <View layout={{ direction: "horizontal", align: "center" }}>
            <Radio value="free" /><Text>Free</Text>
            <Radio value="pro" /><Text>Pro</Text>
          </View>
        </RadioGroup>
        <Text>{`plan = ${plan()}`}</Text>
        <TextField label="Email" value={email()} onChange={setEmail} keyboardType="email" prefixIcon={Icons.email} />
        <View layout={{ direction: "horizontal", gap: 8 }}>
          <Chip label="Chip" icon={Icons.star} />
          <Chip label="Filter" selected={filter()} onSelect={setFilter} />
          <Badge label={3}><IconButton icon={Icons.notifications} /></Badge>
        </View>
        <Card variant="outlined" padding={16} onPress={() => setTaps((n) => n + 1)}>
          <Text>An outlined card. Tap it.</Text>
        </Card>
        <ListTile leading={Icons.wifi} title="Wi-Fi" subtitle="Connected" trailing={<Switch value={on()} onChange={setOn} />} />
        <ProgressIndicator variant="linear" value={volume()} />
        <ProgressIndicator />
        {/* Modals take no space; they can sit anywhere. */}
        <Dialog
          open={dialog()}
          onOpenChange={setDialog}
          title="Discard draft?"
          icon={Icons.delete}
          actions={[
            <Button variant="text" onPress={() => setDialog(false)}>Cancel</Button>,
            <Button variant="text" onPress={() => setDialog(false)}>Discard</Button>,
          ]}
        >
          The draft will be gone.
        </Dialog>
        <BottomSheet open={sheet()} onOpenChange={setSheet} showDragHandle>
          <View padding={24}><Text>A modal bottom sheet. Drag it down.</Text></View>
        </BottomSheet>
      </ScrollView>
    </Scaffold>
  );
}
